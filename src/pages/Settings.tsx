
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/components/ui/use-toast";
import { useForm } from "react-hook-form";
import DexRegistry from "@/services/dex/DexRegistry";
import { DexConfig } from "@/services/dex/types";

const Settings = () => {
  const [dexConfigs, setDexConfigs] = useState<DexConfig[]>([]);
  const [scanSettings, setScanSettings] = useState({
    scanInterval: 30, // seconds
    gasFeeThreshold: 5, // USD
    profitThreshold: 1.0, // percentage
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        // Get DEX configurations
        const dexRegistry = DexRegistry.getInstance();
        const configs = dexRegistry.getAllDexConfigs();
        setDexConfigs(configs);

        // Get scan settings
        const { data, error } = await supabase
          .from('scan_settings')
          .select('*')
          .single();

        if (data && !error) {
          setScanSettings({
            scanInterval: data.scan_interval || 30,
            gasFeeThreshold: data.gas_fee_threshold || 5,
            profitThreshold: data.profit_threshold || 1.0
          });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        toast({
          title: "Error loading settings",
          description: "Failed to load settings. Please try again."
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleDexToggle = async (dexSlug: string, enabled: boolean) => {
    try {
      const dexRegistry = DexRegistry.getInstance();
      dexRegistry.updateDexConfig(dexSlug, enabled);
      
      // Update local state
      setDexConfigs(dexRegistry.getAllDexConfigs());
      
      toast({
        title: "DEX settings updated",
        description: `${dexSlug} is now ${enabled ? 'enabled' : 'disabled'}.`
      });
    } catch (error) {
      console.error("Error updating DEX settings:", error);
      toast({
        title: "Error",
        description: "Failed to update DEX settings."
      });
    }
  };

  const handleScanSettingsSave = async () => {
    try {
      const { error } = await supabase.from('scan_settings').upsert({
        id: 1,
        scan_interval: scanSettings.scanInterval,
        gas_fee_threshold: scanSettings.gasFeeThreshold,
        profit_threshold: scanSettings.profitThreshold,
      });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your scan settings have been updated."
      });
    } catch (error) {
      console.error("Error saving scan settings:", error);
      toast({
        title: "Error",
        description: "Failed to save scan settings."
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="dex">
        <TabsList className="mb-4">
          <TabsTrigger value="dex">DEX Settings</TabsTrigger>
          <TabsTrigger value="scan">Scan Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dex">
          <Card>
            <CardHeader>
              <CardTitle>DEX Configuration</CardTitle>
              <CardDescription>Enable or disable DEX integrations for arbitrage scanning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center p-4">
                    <p>Loading DEX settings...</p>
                  </div>
                ) : (
                  dexConfigs.map((dex) => (
                    <div key={dex.slug} className="flex items-center justify-between py-3">
                      <div>
                        <h3 className="font-medium">{dex.name}</h3>
                        <p className="text-sm text-gray-500">
                          Supported chains: {dex.chainIds.join(", ")} | Fee: {dex.tradingFeePercentage}%
                        </p>
                      </div>
                      <Switch 
                        checked={dex.enabled}
                        onCheckedChange={(checked) => handleDexToggle(dex.slug, checked)}
                      />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="scan">
          <Card>
            <CardHeader>
              <CardTitle>Scan Settings</CardTitle>
              <CardDescription>Configure arbitrage scan settings and thresholds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="scanInterval">Scan Interval (seconds)</Label>
                  <div className="flex items-center gap-4">
                    <Slider 
                      id="scanInterval"
                      min={5}
                      max={300}
                      step={5}
                      value={[scanSettings.scanInterval]}
                      onValueChange={(values) => setScanSettings({...scanSettings, scanInterval: values[0]})}
                      className="flex-grow"
                    />
                    <span className="min-w-16 text-right">{scanSettings.scanInterval}s</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="gasFeeThreshold">Maximum Gas Fee (USD)</Label>
                  <div className="flex items-center gap-4">
                    <Slider 
                      id="gasFeeThreshold"
                      min={0.1}
                      max={50}
                      step={0.1}
                      value={[scanSettings.gasFeeThreshold]}
                      onValueChange={(values) => setScanSettings({...scanSettings, gasFeeThreshold: values[0]})}
                      className="flex-grow"
                    />
                    <span className="min-w-16 text-right">${scanSettings.gasFeeThreshold.toFixed(2)}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="profitThreshold">Minimum Profit Threshold (%)</Label>
                  <div className="flex items-center gap-4">
                    <Slider 
                      id="profitThreshold"
                      min={0.1}
                      max={10}
                      step={0.1}
                      value={[scanSettings.profitThreshold]}
                      onValueChange={(values) => setScanSettings({...scanSettings, profitThreshold: values[0]})}
                      className="flex-grow"
                    />
                    <span className="min-w-16 text-right">{scanSettings.profitThreshold.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleScanSettingsSave}>Save Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>Required environment variables for the application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Supabase Configuration</h3>
                <ul className="list-disc list-inside ml-4 mt-2 text-sm">
                  <li><code>SUPABASE_URL</code> - Your Supabase project URL</li>
                  <li><code>SUPABASE_ANON_KEY</code> - Your Supabase anonymous key</li>
                  <li><code>SUPABASE_SERVICE_ROLE_KEY</code> - Service role key (for edge functions)</li>
                </ul>
              </div>
              <Separator />
              <div>
                <h3 className="font-medium">Blockchain Provider Configuration</h3>
                <ul className="list-disc list-inside ml-4 mt-2 text-sm">
                  <li><code>ALCHEMY_API_KEY</code> - Required for EVM-based chain connections</li>
                  <li><code>INFURA_API_KEY</code> - Alternative provider for EVM connections</li>
                  <li><code>MORALIS_API_KEY</code> - For cross-chain data access</li>
                </ul>
              </div>
              <Separator />
              <div>
                <h3 className="font-medium">AI and Advanced Features</h3>
                <ul className="list-disc list-inside ml-4 mt-2 text-sm">
                  <li><code>OPENAI_API_KEY</code> - For AI-powered trading suggestions (optional)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
