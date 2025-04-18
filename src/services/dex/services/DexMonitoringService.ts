
import { DexAdapter } from '../types';
import { supabase } from '@/lib/supabaseClient';

export class DexMonitoringService {
  private static instance: DexMonitoringService;
  private lastHealthCheck: Map<string, boolean> = new Map();
  
  private constructor() {}
  
  public static getInstance(): DexMonitoringService {
    if (!DexMonitoringService.instance) {
      DexMonitoringService.instance = new DexMonitoringService();
    }
    return DexMonitoringService.instance;
  }

  public async checkDexHealth(adapter: DexAdapter): Promise<boolean> {
    try {
      const dexKey = `${adapter.getName()}-${adapter.getSupportedChains()[0]}`;
      const isHealthy = await this.performHealthCheck(adapter);
      
      // Store health status
      await supabase.from('dex_health_checks').insert({
        dex_name: adapter.getName(),
        status: isHealthy ? 'online' : 'degraded',
        chain_id: adapter.getSupportedChains()[0],
        response_time_ms: 0,
        error_message: isHealthy ? null : 'Failed health check'
      });
      
      this.lastHealthCheck.set(dexKey, isHealthy);
      return isHealthy;
    } catch (error) {
      console.error(`Health check failed for ${adapter.getName()}:`, error);
      return false;
    }
  }

  private async performHealthCheck(adapter: DexAdapter): Promise<boolean> {
    try {
      // Check if adapter is enabled and responsive
      if (!adapter.isEnabled()) {
        return false;
      }

      // Get supported chains
      const chains = adapter.getSupportedChains();
      if (!chains || chains.length === 0) {
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error in health check for ${adapter.getName()}:`, error);
      return false;
    }
  }

  public isDexHealthy(dexName: string, chainId: number): boolean {
    const dexKey = `${dexName}-${chainId}`;
    return this.lastHealthCheck.get(dexKey) || false;
  }
}
