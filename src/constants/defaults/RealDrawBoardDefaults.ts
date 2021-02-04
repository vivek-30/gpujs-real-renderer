import { RealDrawBoardOptions } from '../../types/RealDrawBoardTypes';

export const RealDrawBoardDefaults: RealDrawBoardOptions = {
  brushSize: 1,
  eraserSize: 2,
  brushColor: [1, 1, 1],
  allowUndo: false,
  maxUndos: 10,
  mode: 'paint'
}
