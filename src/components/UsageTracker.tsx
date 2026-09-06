import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { recordAreaAccess } from '../services/userAnalyticsService';
import { areaForPath } from '../services/userAnalyticsRoutes';

export default function UsageTracker(): null {
  const { pathname } = useLocation();
  useEffect(() => {
    const area = areaForPath(pathname);
    if (area) void recordAreaAccess(area);
  }, [pathname]);
  return null;
}
