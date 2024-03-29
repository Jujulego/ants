import { IVector, Vector } from '@ants/maths';
import { concat, defer, filter, map, Observable } from 'rxjs';

import { Awaitable } from '../../types';
import { Ant } from '../Ant';

// Interfaces
export interface AntWithMemory<T> extends Ant {
  // Properties
  readonly memory: AntMemory<T>;
}

export abstract class AntMemory<T> {
  // Attributes
  readonly updates$: Observable<[IVector, T]>;

  // Methods
  abstract get(pos: IVector): Awaitable<T | undefined>;

  get$(pos: Vector): Observable<[IVector, T]> {
    return concat(
      defer(async () => await this.get(pos)).pipe(
        filter((data): data is T => data !== undefined),
        map((data) => [pos, data] as [IVector, T]),
      ),
      this.updates$.pipe(
        filter((upd) => pos.equals(upd[0]))
      )
    );
  }
}

