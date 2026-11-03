// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice BDEX (BOT Chain) V3 SwapRouter: Uniswap V3 exactInputSingle with a deadline field.
interface IBotV3Router {
    struct Params {address tokenIn; address tokenOut; uint24 fee; address recipient; uint256 deadline; uint256 amountIn; uint256 amountOutMinimum; uint160 sqrtPriceLimitX96;}
    function exactInputSingle(Params calldata p) external payable returns(uint256);
}

/// @notice The same BDEX router's multi-hop entry point and its pool factory.
interface IBotV3PathRouter {
    struct PathParams {bytes path; address recipient; uint256 deadline; uint256 amountIn; uint256 amountOutMinimum;}
    function exactInput(PathParams calldata p) external payable returns(uint256);
    function factory() external view returns(address);
}

interface IBotV3Factory {function getPool(address a,address b,uint24 fee) external view returns(address);}
