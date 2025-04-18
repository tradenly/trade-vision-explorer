
import { useState, useEffect } from 'react';
import { DexMonitoringService } from '@/services/dex/services/DexMonitoringService';
import DexRegistry from '@/services/dex/DexRegistry';

export interface DexHealthStatus {
  dexName: string;
  isHealthy: boolean;
  chainId: number;
  lastChecked: Date;
}

export function useDexHealth() {
  const [healthStatus, setHealthStatus] = useState<DexHealthStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkDexHealth = async () => {
      try {
        const dexRegistry = DexRegistry.getInstance();
        const monitoringService = DexMonitoringService.getInstance();
        const allDexes = dexRegistry.getAllDexConfigs();
        
        const statuses: DexHealthStatus[] = [];
        
        for (const dex of allDexes) {
          for (const chainId of dex.chainIds) {
            const adapters = dexRegistry.getAdaptersForChain(chainId);
            const adapter = adapters.find(a => a.getSlug() === dex.slug);
            
            if (adapter) {
              const isHealthy = await monitoringService.checkDexHealth(adapter);
              statuses.push({
                dexName: dex.name,
                isHealthy,
                chainId,
                lastChecked: new Date()
              });
            }
          }
        }
        
        setHealthStatus(statuses);
      } catch (error) {
        console.error('Error checking DEX health:', error);
      } finally {
        setLoading(false);
      }
    };

    // Check health initially and every 5 minutes
    checkDexHealth();
    const interval = setInterval(checkDexHealth, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { healthStatus, loading };
}
