
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Tradenly Trading Bot</h1>
        <p className="text-xl text-gray-600 mb-8">Your multi-chain arbitrage and trading solution</p>
        
        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Link 
            to="/dashboard" 
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            View Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
