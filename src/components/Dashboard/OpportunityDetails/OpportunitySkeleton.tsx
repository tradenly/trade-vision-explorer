
import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

const OpportunitySkeleton = () => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Token Pair and Network */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-32" />
        </div>
        
        {/* Buy and Sell DEX */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-40" />
        </div>
        
        {/* Investment and Price Difference */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-28" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-28" />
        </div>
        
        {/* Fees and Profit */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-36" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-36" />
        </div>
      </div>
    </div>
  );
};

export default OpportunitySkeleton;
