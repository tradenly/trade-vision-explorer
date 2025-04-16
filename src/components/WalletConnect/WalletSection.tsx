
import React from 'react';
import MetaMaskConnect from './MetaMaskConnect';
import SolanaConnect from './SolanaConnect';

const WalletSection: React.FC = () => {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Wallet Connections</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetaMaskConnect />
        <SolanaConnect />
      </div>
    </div>
  );
};

export default WalletSection;
