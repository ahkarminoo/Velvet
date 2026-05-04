"use client";

import PublicFloorPlan from './PublicFloorPlan';
import { RiLayoutLine } from 'react-icons/ri';

export default function PublicFloorplanSelector({ restaurant, defaultDate, defaultTime, defaultEventId }) {
  if (!restaurant.allFloorplans || restaurant.allFloorplans.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-12">
        <RiLayoutLine style={{ fontSize: '40px', color: '#1E1D2A', marginBottom: '12px' }} />
        <p className="text-sm" style={{ color: '#9B96A8' }}>No floor plan available</p>
      </div>
    );
  }

  // Always show the default (or first) floorplan.
  // PublicFloorPlan handles event-based floorplan swapping internally.
  const defaultFloorplan =
    restaurant.allFloorplans.find(fp => fp.isDefault) || restaurant.allFloorplans[0];

  return (
    <PublicFloorPlan
      key={`${defaultFloorplan._id}-${defaultDate ?? 'today'}-${defaultTime ?? 'free'}-${defaultEventId ?? 'none'}`}
      floorplanData={defaultFloorplan.data}
      floorplanId={defaultFloorplan._id}
      restaurantId={restaurant._id}
      allFloorplans={restaurant.allFloorplans}
      defaultDate={defaultDate}
      defaultTime={defaultTime}
      defaultEventId={defaultEventId}
    />
  );
}
