import seedrandom from 'seedrandom';

import { TileGenerator, TileGeneratorOpts } from './tile-generator';
import { ITile } from '../tile';
import { BST } from '../utils';
import { IWorld } from '../world';

// Types
export interface RandomGeneratorOpts extends TileGeneratorOpts {
  readonly biomes: Record<string, number>;
  readonly seed?: string;
}

type Cumulated = [biome: string, f: number];

// Class
export class RandomGenerator extends TileGenerator<RandomGeneratorOpts> {
  // Methods
  private _cumulate(biomes: Record<string, number>): BST<Cumulated, number> {
    const cumulated: Cumulated[] = [];

    // Cumulate
    let sum = 0;

    for (const biome of Object.keys(biomes)) {
      const frq = biomes[biome];

      if (frq > 0) {
        sum += frq;
        cumulated.push([biome, sum]);
      }
    }

    // Regulate
    for (let i = 0; i < cumulated.length; ++i) {
      cumulated[i][1] /= sum;
    }

    return BST.fromArray(cumulated, ([, f]) => f, (a, b) => b - a);
  }

  protected *generate(world: IWorld, opts: RandomGeneratorOpts): Generator<ITile> {
    const biomes = this._cumulate(opts.biomes);

    const cnt: Record<string, number> = {};

    for (let y = opts.bbox.b; y < opts.bbox.t; ++y) {
      for (let x = opts.bbox.l; x < opts.bbox.r; ++x) {
        const prng = seedrandom(`${opts.seed}-${x}-${y}`);
        const res = biomes.nearest(prng.quick(), 'lte');

        if (res) {
          const biome = res[0];
          cnt[biome] = (cnt[biome] ?? 0) + 1;

          yield { pos: { x, y }, biome };
        }
      }
    }
  }
}
