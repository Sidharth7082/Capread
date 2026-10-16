import { useEffect, useRef, useState } from 'react';
import type { Query } from 'drizzle-orm';

import { db } from '@database/db';
import type { FireOn } from './manager';

interface ExecutableSelect<TResult = any> {
  toSQL(): Query;
  all(): Promise<TResult[]>;
}

export function useLiveQuery<T extends ExecutableSelect>(
  query: T,
  fireOn: FireOn,
  callback?: (data: Awaited<ReturnType<T['all']>>) => void,
) {
  type ReturnValue = Awaited<ReturnType<T['all']>>;

  const { sql: sqlString, params } = query.toSQL();
  const paramsKey = JSON.stringify(params);
  const fireOnKey = JSON.stringify(fireOn);
  const callbackRef = useRef(callback);

  const [data, setData] = useState<ReturnValue>(
    () => db.executeSync(sqlString, params as any[]).rows as ReturnValue,
  );

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    callbackRef.current?.(data);
  }, [data]);

  useEffect(() => {
    const unsubscribe = db.reactiveExecute({
      query: sqlString,
      arguments: params as any[],
      fireOn,
      callback: (result: { rows: ReturnValue }) => {
        setData(result.rows);
      },
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqlString, paramsKey, fireOnKey]);

  return data;
}
