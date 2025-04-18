
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Settings } from 'lucide-react';

const DashboardHeader = () => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="flex space-x-2">
        <Link to="/arbitrage">
          <Button variant="outline" className="flex gap-2 items-center">
            Arbitrage Scanner <ArrowRight size={16} />
          </Button>
        </Link>
        <Link to="/settings">
          <Button variant="outline" className="flex gap-2 items-center">
            <Settings size={16} />
            Settings
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default DashboardHeader;
