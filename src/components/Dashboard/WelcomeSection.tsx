
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const WelcomeSection = () => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Welcome to Tradenly Trading Bot</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4">
          Tradenly is an AI-powered trading platform that helps you find arbitrage opportunities across multiple blockchains and DEXs.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          <Link to="/arbitrage" className="block">
            <Card className="hover:bg-muted transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Arbitrage Scanner</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Find price differences between DEXs and execute profitable trades.</p>
              </CardContent>
            </Card>
          </Link>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">AI Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Get AI-powered insights and recommendations for your trading strategy.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Copy Trading</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Follow successful traders and automatically copy their trades.</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

export default WelcomeSection;
