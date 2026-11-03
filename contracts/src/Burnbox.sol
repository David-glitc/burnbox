// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IBotV3PathRouter} from "./interfaces/IBotV3Router.sol";

interface IWBOTBurn {function deposit() external payable;}

/// @notice Public buyback-and-burn vaults. Anyone funds a box with BOT; anyone stokes it, which buys the token on BDEX
/// and sends it to the dead address. Funded BOT can only leave as burned tokens or as the stoker's 0.3% tip. No fee.
/// @dev Each stoke spends at most `maxPerBurn` and never pays more than `maxPrice` BOT per whole token, so a sandwich
/// around a stoke is bounded by the creator's price ceiling and the cooldown.
contract Burnbox is ReentrancyGuard {
    using SafeERC20 for IERC20;
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;
    uint16 public constant TIP_BPS = 30;
    uint32 public constant MAX_COOLDOWN = 7 days;
    address public immutable router;
    address public immutable wbot;
    struct Box {
        address creator; address token; uint8 decimals; uint32 cooldown; uint64 lastBurn; uint32 burns;
        uint256 maxPerBurn; uint256 maxPrice; uint256 balance; uint256 funded; uint256 spent; uint256 burned;
        bytes path; string label;
    }
    Box[] private boxes;
    mapping(uint256=>mapping(address=>uint256)) public fundedBy;
    mapping(address=>uint256[]) private byToken;
    event Opened(uint256 indexed id,address indexed creator,address indexed token,string label);
    event Funded(uint256 indexed id,address indexed from,uint256 amount);
    event Burned(uint256 indexed id,address indexed stoker,uint256 botIn,uint256 tokensBurned,uint256 tip);
    event RouteSet(uint256 indexed id,bytes path,uint256 maxPerBurn,uint256 maxPrice,uint32 cooldown);

    constructor(address router_,address wbot_){require(router_.code.length>0&&wbot_.code.length>0,"missing infrastructure");router=router_;wbot=wbot_;}

    function open(address token,bytes calldata path,uint256 maxPerBurn,uint256 maxPrice,uint32 cooldown,string calldata label) external payable returns(uint256 id){
        require(token!=wbot&&token.code.length>0,"bad token");require(bytes(label).length<=60,"label too long");
        uint8 dec=IERC20Metadata(token).decimals();
        id=boxes.length;boxes.push();Box storage b=boxes[id];
        b.creator=msg.sender;b.token=token;b.decimals=dec;b.label=label;
        _route(b,id,path,maxPerBurn,maxPrice,cooldown);
        byToken[token].push(id);emit Opened(id,msg.sender,token,label);
        if(msg.value>0)_fund(id,b);
    }
    /// @notice The creator can re-route or re-price a box; every change is an event on BOTScan.
    function setRoute(uint256 id,bytes calldata path,uint256 maxPerBurn,uint256 maxPrice,uint32 cooldown) external {
        Box storage b=_box(id);require(msg.sender==b.creator,"not creator");_route(b,id,path,maxPerBurn,maxPrice,cooldown);
    }
    function fund(uint256 id) external payable {require(msg.value>0,"no BOT");_fund(id,_box(id));}

    /// @notice Spend up to maxPerBurn of the box on its token and burn everything bought. `minOut` can only tighten the box's price ceiling.
    function burn(uint256 id,uint256 minOut) external nonReentrant returns(uint256 burned){
        Box storage b=_box(id);
        require(b.burns==0||block.timestamp>=uint256(b.lastBurn)+b.cooldown,"cooling down");
        uint256 amount=b.balance<b.maxPerBurn?b.balance:b.maxPerBurn;require(amount>0,"box empty");
        uint256 tip=amount*TIP_BPS/10_000;uint256 spend=amount-tip;
        uint256 floor=spend*(10**b.decimals)/b.maxPrice;require(floor>0,"amount too small");
        if(minOut<floor)minOut=floor;
        b.balance-=amount;b.spent+=amount;b.lastBurn=uint64(block.timestamp);b.burns++;
        IWBOTBurn(wbot).deposit{value:spend}();IERC20(wbot).forceApprove(router,spend);
        uint256 before=IERC20(b.token).balanceOf(DEAD);
        IBotV3PathRouter(router).exactInput(IBotV3PathRouter.PathParams(b.path,DEAD,block.timestamp,spend,minOut));
        IERC20(wbot).forceApprove(router,0);
        burned=IERC20(b.token).balanceOf(DEAD)-before;require(burned>=minOut,"burn short");
        b.burned+=burned;
        (bool ok,)=msg.sender.call{value:tip}("");require(ok,"tip failed");
        emit Burned(id,msg.sender,spend,burned,tip);
    }

    function _fund(uint256 id,Box storage b) private {b.balance+=msg.value;b.funded+=msg.value;fundedBy[id][msg.sender]+=msg.value;emit Funded(id,msg.sender,msg.value);}
    function _route(Box storage b,uint256 id,bytes calldata path,uint256 maxPerBurn,uint256 maxPrice,uint32 cooldown) private {
        // A V3 path is token(20) + n × (fee(3) + token(20)); it must start at WBOT and end at the box's token, with 1–3 hops.
        uint256 n=path.length;require(n>=43&&n<=89&&(n-20)%23==0,"bad path");
        require(address(bytes20(path[:20]))==wbot&&address(bytes20(path[n-20:]))==b.token,"path must run WBOT to token");
        require(maxPerBurn>0&&maxPrice>0&&cooldown<=MAX_COOLDOWN,"bad limits");
        b.path=path;b.maxPerBurn=maxPerBurn;b.maxPrice=maxPrice;b.cooldown=cooldown;emit RouteSet(id,path,maxPerBurn,maxPrice,cooldown);
    }
    function _box(uint256 id) private view returns(Box storage){require(id<boxes.length,"no box");return boxes[id];}
    function boxCount() external view returns(uint256){return boxes.length;}
    function getBox(uint256 id) external view returns(Box memory){return _box(id);}
    function boxesFor(address token) external view returns(uint256[] memory){return byToken[token];}
    /// @return seconds until the box can be stoked again (0 when ready).
    function cooldownLeft(uint256 id) external view returns(uint256){Box storage b=_box(id);if(b.burns==0)return 0;uint256 at=uint256(b.lastBurn)+b.cooldown;return block.timestamp>=at?0:at-block.timestamp;}
}
