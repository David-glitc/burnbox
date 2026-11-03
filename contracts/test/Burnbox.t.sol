// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Burnbox} from "../src/Burnbox.sol";
import {IBotV3PathRouter} from "../src/interfaces/IBotV3Router.sol";

contract BurnWBOT is ERC20 {constructor() ERC20("Wrapped BOT","WBOT"){} function deposit() external payable {_mint(msg.sender,msg.value);}}
contract BurnToken is ERC20 {constructor() ERC20("Ember","EMB"){} function mint(address a,uint256 n) external {_mint(a,n);}}
/// @dev Pays out `rate` whole tokens per WBOT through the last token of the path, like a BDEX pool would.
contract MockPathRouter {
    BurnWBOT public wbot;uint256 public rate;
    constructor(BurnWBOT w,uint256 r){wbot=w;rate=r;}
    function setRate(uint256 r) external {rate=r;}
    function exactInput(IBotV3PathRouter.PathParams calldata p) external payable returns(uint256 out){
        require(p.deadline>=block.timestamp,"expired");wbot.transferFrom(msg.sender,address(this),p.amountIn);
        address token=address(bytes20(p.path[p.path.length-20:]));out=p.amountIn*rate;require(out>=p.amountOutMinimum,"Too little received");
        BurnToken(token).mint(p.recipient,out);
    }
}

contract BurnboxTest is Test {
    address alice=address(0xA11CE);address bob=address(0xB0B);address carol=address(0xCA401);
    BurnWBOT w;BurnToken t;MockPathRouter r;Burnbox b;
    function setUp() public {w=new BurnWBOT();t=new BurnToken();r=new MockPathRouter(w,1000);b=new Burnbox(address(r),address(w));vm.deal(alice,10 ether);vm.deal(bob,10 ether);}
    function path() internal view returns(bytes memory){return abi.encodePacked(address(w),uint24(10000),address(t));}
    function test_openFundBurn() public {
        // At most 1 BOT per stoke, never above 0.01 BOT per token (100 tokens per BOT floor).
        vm.prank(alice);uint256 id=b.open{value:2 ether}(address(t),path(),1 ether,0.01 ether,600,"EMB furnace");
        vm.prank(bob);b.fund{value:1 ether}(id);
        assertEq(b.getBox(id).balance,3 ether);assertEq(b.fundedBy(id,bob),1 ether);
        vm.prank(carol);uint256 burned=b.burn(id,0);
        uint256 spend=1 ether-1 ether*30/10000;
        assertEq(burned,spend*1000);assertEq(t.balanceOf(b.DEAD()),burned);assertEq(carol.balance,1 ether*30/10000);
        assertEq(b.getBox(id).balance,2 ether);assertEq(b.getBox(id).burned,burned);assertEq(b.getBox(id).burns,1);
        vm.expectRevert(bytes("cooling down"));b.burn(id,0);
        assertEq(b.cooldownLeft(id),600);
        vm.warp(vm.getBlockTimestamp()+600);b.burn(id,0);assertEq(b.getBox(id).burns,2);
    }
    function test_priceCeilingStopsOverpaying() public {
        vm.prank(alice);uint256 id=b.open{value:1 ether}(address(t),path(),1 ether,0.01 ether,0,"");
        r.setRate(50); // 0.02 BOT per token: above the 0.01 ceiling, so the router cannot meet the floor
        vm.expectRevert(bytes("Too little received"));b.burn(id,0);
        assertEq(b.getBox(id).balance,1 ether);
    }
    function test_routeRules() public {
        vm.startPrank(alice);
        vm.expectRevert(bytes("bad path"));b.open(address(t),abi.encodePacked(address(w)),1,1,0,"");
        vm.expectRevert(bytes("path must run WBOT to token"));b.open(address(t),abi.encodePacked(address(t),uint24(3000),address(w)),1,1,0,"");
        vm.expectRevert(bytes("bad limits"));b.open(address(t),path(),1,1,8 days,"");
        uint256 id=b.open(address(t),path(),1 ether,1 ether,0,"");
        vm.stopPrank();
        vm.prank(bob);vm.expectRevert(bytes("not creator"));b.setRoute(id,path(),1,1,0);
        vm.expectRevert(bytes("box empty"));b.burn(id,0);
        assertEq(b.boxesFor(address(t)).length,1);
    }
    function test_smallBalanceBurnsRemainder() public {
        vm.prank(alice);uint256 id=b.open{value:0.3 ether}(address(t),path(),1 ether,0.01 ether,0,"");
        b.burn(id,0);assertEq(b.getBox(id).balance,0);assertEq(b.getBox(id).spent,0.3 ether);
    }
    receive() external payable {}
}

/// @dev Live BDEX rehearsal: FOUNDRY_FORK=1 forge test --match-contract BurnboxFork. Buys CA with WBOT through the real 1% pool.
contract BurnboxForkTest is Test {
    address constant ROUTER=0x07032d47A1b9f8460cBeE9dC17c1d3E438693929;address constant WBOT=0xD5452816194a3784dBa983426cCe7c122F4abd30;
    address constant CA=0x546307af427902A75771434Df831d88219784E19;
    function test_burnCAOnMainnetFork() public {
        if(!vm.envOr("FOUNDRY_FORK",false))return;
        vm.createSelectFork("https://rpc.botchain.ai");
        Burnbox b=new Burnbox(ROUTER,WBOT);vm.deal(address(this),1 ether);
        uint256 id=b.open{value:0.2 ether}(CA,abi.encodePacked(WBOT,uint24(10000),CA),0.1 ether,1000 ether,0,"fork");
        uint256 burned=b.burn(id,0);assertGt(burned,0);assertEq(b.getBox(id).burned,burned);
        emit log_named_uint("CA burned for 0.0997 WBOT",burned);
    }
    receive() external payable {}
}
