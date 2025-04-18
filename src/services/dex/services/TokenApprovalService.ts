
import { TokenInfo } from '@/services/tokenListService';
import { TransactionStatus } from '../types';
import { supabase } from '@/lib/supabaseClient';

/**
 * Service to handle token approvals for EVM chains
 */
export class TokenApprovalService {
  private static instance: TokenApprovalService;

  private constructor() {}

  public static getInstance(): TokenApprovalService {
    if (!TokenApprovalService.instance) {
      TokenApprovalService.instance = new TokenApprovalService();
    }
    return TokenApprovalService.instance;
  }

  /**
   * Check if token approval is needed
   */
  public async checkTokenApproval(
    token: TokenInfo,
    walletAddress: string,
    network: string,
    spenderAddress?: string
  ): Promise<boolean> {
    try {
      // Query database for existing approvals
      const { data: existingApproval } = await supabase
        .from('token_approvals')
        .select('*')
        .eq('token_address', token.address.toLowerCase())
        .eq('wallet_address', walletAddress.toLowerCase())
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingApproval && existingApproval.length > 0) {
        return false; // Already approved
      }

      // If no record in database, check on-chain via edge function
      const routerAddress = spenderAddress || this.getRouterAddress(token.symbol, network);
      
      const { data, error } = await supabase.functions.invoke('check-token-approval', {
        body: {
          tokenAddress: token.address,
          walletAddress,
          spenderAddress: routerAddress,
          network
        }
      });

      if (error || !data) {
        console.error('Error checking token approval:', error);
        return true; // Assume approval needed if check fails
      }

      return !data.isApproved;
    } catch (error) {
      console.error('Error checking token approval:', error);
      return true; // Assume approval needed if check fails
    }
  }

  /**
   * Execute token approval transaction
   */
  public async approveToken(
    token: TokenInfo,
    walletAddress: string,
    network: string,
    spenderAddress?: string
  ): Promise<{
    status: TransactionStatus;
    error?: string;
    txHash?: string;
    details?: any;
  }> {
    try {
      const routerAddress = spenderAddress || this.getRouterAddress(token.symbol, network);
      
      console.log(`Requesting approval for ${token.symbol} to spender ${routerAddress}`);
      
      // Call edge function to handle approval
      const { data, error } = await supabase.functions.invoke('approve-token', {
        body: {
          tokenAddress: token.address,
          spenderAddress: routerAddress,
          walletAddress,
          network
        }
      });

      if (error || !data.success) {
        return {
          status: TransactionStatus.ERROR,
          error: error?.message || data?.error || 'Failed to approve token'
        };
      }

      // Track approval in database
      await supabase.from('token_approvals').insert({
        wallet_address: walletAddress,
        token_address: token.address,
        spender_address: routerAddress,
        amount: 'unlimited',
        tx_hash: data.txHash,
        status: 'completed'
      });

      return {
        status: TransactionStatus.SUCCESS,
        txHash: data.txHash,
        details: data.details
      };
    } catch (error) {
      console.error('Error approving token:', error);
      return {
        status: TransactionStatus.ERROR,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }
  
  /**
   * Get router contract address for DEX
   */
  private getRouterAddress(dexOrToken: string, network: string): string {
    const routerAddresses: Record<string, Record<string, string>> = {
      ethereum: {
        uniswap: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        sushiswap: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
        // Add more DEX addresses here
      },
      arbitrum: {
        uniswap: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      },
      polygon: {
        quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
        sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
      },
      bnb: {
        pancakeswap: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
      },
      // Add more networks and DEXes as needed
    };
    
    // If a token name is provided, return a default router for the network
    if (!routerAddresses[network]) {
      return '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // Default to Uniswap v2
    }
    
    const dexName = dexOrToken.toLowerCase();
    const networkRouters = routerAddresses[network];
    
    return networkRouters[dexName] || Object.values(networkRouters)[0];
  }
}
