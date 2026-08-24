import { useEffect, useState } from 'react';
import { employmentApi, type EmploymentMasters } from '../api/employment.api';

const EMPTY: EmploymentMasters = { departments: [], designations: [], titles: [], banks: [] };

export function useEmploymentMasters() {
  const [masters, setMasters] = useState<EmploymentMasters>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    employmentApi.getMasters()
      .then((m) => { if (!cancelled) setMasters(m); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { ...masters, loading };
}
