import { IRect } from '@ants/maths';
import { $entity, $store } from '@jujulego/aegis';
import { $api } from '@jujulego/aegis-api';

// Types
export interface ITileMap {
  id: string;
  table: 'tile-map';
  name: string;
  bbox: IRect;
}

// Entity
export const TileMap = $entity('TileMap', $store.memory(), (itm: ITileMap) => itm.id)
  .$protocol(({ $list }) => ({
    findAll: $list.query($api.get`http://localhost:3000/api/tile-maps`)
  }));