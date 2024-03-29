import { IVector, NULL_VECTOR, Vector } from '@ants/maths';

import { BiomeName } from '../biomes';
import { Map } from '../maps';
import { PriorityQueue } from '../utils';
import { Ant } from './Ant';
import { KnownData } from './AntKnowledge';
import { TreeData } from './AntTree';
import type { AntColorName } from './colors';
import { AntWithMemory } from './memory/AntMemory';
import { AntMapMemory } from './memory/AntMapMemory';
import { AntWorker } from './worker/AntWorker';
import { AntNetwork, AntWithNetwork } from './network/AntNetwork';

// Types
export interface DStarData extends KnownData, TreeData {
  // Attributes
  // - algorithm data
  next?: Vector;
  cost: number;
  minCost: number;

  // - map data
  obstacle?: boolean;
  biome?: BiomeName;
}

// Class
export abstract class DStarAntWorker extends Ant implements AntWorker, AntWithMemory<DStarData>, AntWithNetwork {
  // Inspired by https://fr.wikipedia.org/wiki/Algorithme_D*
  // Attributes
  private _target?: Vector;
  private _updates = new PriorityQueue<Vector>();

  readonly memory = new AntMapMemory<DStarData>();
  readonly network = new AntNetwork(this);

  // Constructor
  constructor(name: string, map: Map, color: AntColorName, position: Vector) {
    super(name, map, color, position);

    // Setup map updates pipeline
    this.network.mapUpdates$.subscribe(({ pos, biome }) => {
      if (!this._target) return;

      const data = this.getMapData(pos);
      this._detected(new Vector(pos), data, biome);
      this._expand();
    });
  }

  // Abstract methods
  protected abstract heuristic(from: Vector, to: Vector): number;
  protected abstract shallExpand(pos: Vector): boolean;
  protected abstract look(next: Vector): Vector[];

  // Methods
  // - map data
  getMapData(p: IVector): DStarData {
    return this.memory.get(p) ?? { cost: Infinity, minCost: Infinity };
  }

  private _updateMapData(p: Vector, update: Partial<DStarData>) {
    // Compute new value
    const old = this.getMapData(p);
    const res = { ...old, ...update };

    // Corrections
    res.minCost = Math.min(res.cost, res.minCost);
    if (res.cost === Infinity) res.next = undefined;

    // Save
    this.memory.put(p, res);

    if (old.minCost !== res.minCost) {
      this._updates.updateCosts((p) => this.getMapData(p).minCost);
    }
  }

  // - algorithm
  async compute(target: Vector): Promise<Vector> {
    // Arrived !
    if (this.position.equals(target)) {
      return NULL_VECTOR;
    }

    // Update target, detect and expand
    this.updateTarget(target);

    do {
      const { next } = this.getMapData(this.position);
      await this.detect(next ?? this.position);

      this._expand();
    } while (this._updates.size > 0);

    // Compute next move
    const { next } = this.getMapData(this.position);
    return next ? next.sub(this.position) : NULL_VECTOR;
  }

  protected updateTarget(target: Vector): void {
    if (this._target?.equals(target)) return;

    // Reset previous costs
    if (this._target) {
      for (const [pos, data] of this.memory) {
        if (data.obstacle) continue;

        this.memory.put(pos, { ...data, next: undefined, cost: Infinity, minCost: Infinity });
      }
    }

    // Set new target cost to 0
    this._updateMapData(target, { next: undefined, cost: 0 });
    this._updateTile(target);

    // Update target
    this._target = target;
  }

  protected async detect(next: Vector): Promise<void> {
    for (const pos of this.look(next)) {
      const data = this.getMapData(pos);

      if (data.detected) {
        continue;
      }

      const tile = await this.map.tile(pos);

      if (tile) {
        this._detected(pos, data, tile.biome);
        this.network.sendMapUpdate(pos, tile.biome);
      }
    }
  }

  private _detected(pos: Vector, data: DStarData, biome: BiomeName): void {
    const upd: Partial<DStarData> = {
      detected: true,
      obstacle: biome === 'water',
      biome,
    };

    if (biome === 'water') {
      upd.cost = Infinity;
      upd.minCost = Infinity;
      this._updateMapData(pos, upd);

      for (const p of this.surroundings(pos)) {
        const d = this.getMapData(p);

        if (d.next?.equals(pos)) {
          this._updateMapData(p, { cost: Infinity });
          this._updateTile(p);
        }
      }
    } else {
      this._updateMapData(pos, upd);
      upd.cost = this._evaluate(pos, data.next);

      if (upd.cost !== data.cost) {
        this._updateMapData(pos, upd);
        this._updateTile(pos);
      }
    }
  }

  private _expand(): void {
    while (this._updates.size > 0) {
      const pos = this._updates.pop();

      if (!pos) break;
      if (this.getMapData(pos).obstacle) continue;
      if (!this.shallExpand(pos)) continue;

      const isRaising = this._isRaising(pos);

      for (const p of this.surroundings(pos)) {
        const d = this.getMapData(p);
        const c = this._evaluate(p, pos);

        if (isRaising) {
          if (d.next?.equals(pos)) {
            this._updateMapData(p, { cost: c });
            this._updateTile(p);
          } else if (c < d.cost) {
            this._updateMapData(pos, { minCost: this.getMapData(pos).cost });
            this._updateTile(p);
          }
        } else {
          if (c < d.cost) {
            this._updateMapData(p, { next: pos, cost: c });
            this._updateTile(p);
          }
        }
      }
    }
  }

  private _isRaising(pos: Vector): boolean {
    const data = this.getMapData(pos);

    if (data.cost > data.minCost) {
      for (const p of this.surroundings(pos)) {
        const c = this._evaluate(pos, p);

        if (c < data.cost) {
          data.next = p;
          data.cost = c;
        }
      }
    }

    this._updateMapData(pos, data);
    return data.cost > data.minCost;
  }

  private _evaluate(pos: Vector, by?: Vector): number {
    // Check if path is possible
    let next = by;

    if (!by) {
      return this._target!.equals(pos) ? 0 : Infinity;
    }

    while (next) {
      const dn = this.getMapData(next);

      if (dn.cost === Infinity || next.equals(pos)) {
        return Infinity;
      }

      next = dn.next;
    }

    // Compute it's cost
    return this.getMapData(by).cost + this.heuristic(pos, by);
  }

  private _updateTile(...upd: Vector[]) {
    for (const u of upd) {
      const data = this.getMapData(u);

      if (this._updates.search(data.minCost).every(v => !v.equals(u))) {
        this._updates.add(u, data.minCost);
      }
    }
  }

  protected* surroundings(pos: Vector): Generator<Vector> {
    for (const p of super.surroundings(pos)) {
      if (this.getMapData(p).obstacle) continue;
      yield p;
    }
  }

  // Properties
  get target(): Vector | undefined {
    return this._target;
  }
}
