
import { supabase } from '@/lib/supabaseClient';
import DexRegistry from '../DexRegistry';

interface DexHealthRecord {
  dex_name: string;
  status: 'online' | 'degraded' | 'offline';
  last_check: Date;
  response_time_ms: number;
  chain_id: number;
  error_message?: string;
}

export class DexHealthService {
  private static instance: DexHealthService;
  private lastHealthCheck: Record<string, DexHealthRecord> = {};
  
  private constructor() {}
  
  public static getInstance(): DexHealthService {
    if (!DexHealthService.instance) {
      DexHealthService.instance = new DexHealthService();
    }
    return DexHealthService.instance;
  }
  
  /**
   * Run health checks on all DEX adapters
   */
  public async checkAllDexes(): Promise<Record<string, DexHealthRecord>> {
    const dexRegistry = DexRegistry.getInstance();
    const dexConfigs = dexRegistry.getAllDexConfigs();
    const results: Record<string, DexHealthRecord> = {};
    
    for (const config of dexConfigs) {
      // Check each chain the DEX supports
      for (const chainId of config.chainIds) {
        const key = `${config.slug}-${chainId}`;
        const startTime = Date.now();
        
        try {
          // Get adapters for this chain
          const adapters = dexRegistry.getAdaptersForChain(chainId);
          const adapter = adapters.find(a => a.getSlug() === config.slug);
          
          if (!adapter) {
            results[key] = {
              dex_name: config.name,
              status: 'offline',
              last_check: new Date(),
              response_time_ms: 0,
              chain_id: chainId,
              error_message: 'Adapter not found'
            };
            continue;
          }
          
          // Check if adapter is enabled
          if (!adapter.isEnabled()) {
            results[key] = {
              dex_name: config.name,
              status: 'offline',
              last_check: new Date(),
              response_time_ms: 0,
              chain_id: chainId,
              error_message: 'Adapter disabled'
            };
            continue;
          }
          
          // Record the health check
          const endTime = Date.now();
          results[key] = {
            dex_name: config.name,
            status: 'online',
            last_check: new Date(),
            response_time_ms: endTime - startTime,
            chain_id: chainId
          };
          
        } catch (error) {
          const endTime = Date.now();
          results[key] = {
            dex_name: config.name,
            status: 'offline',
            last_check: new Date(),
            response_time_ms: endTime - startTime,
            chain_id: chainId,
            error_message: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }
    }
    
    this.lastHealthCheck = results;
    await this.persistHealthCheck(results);
    
    return results;
  }
  
  /**
   * Save DEX health check results to Supabase
   */
  private async persistHealthCheck(results: Record<string, DexHealthRecord>): Promise<void> {
    try {
      const records = Object.values(results).map(record => ({
        dex_name: record.dex_name,
        status: record.status,
        chain_id: record.chain_id,
        response_time_ms: record.response_time_ms,
        error_message: record.error_message || null
      }));
      
      await supabase
        .from('dex_health_checks')
        .insert(records);
    } catch (error) {
      console.error('Failed to persist DEX health check:', error);
    }
  }
  
  /**
   * Get the latest health status for a specific DEX
   */
  public getDexHealth(dexSlug: string, chainId: number): DexHealthRecord | null {
    const key = `${dexSlug}-${chainId}`;
    return this.lastHealthCheck[key] || null;
  }
}
