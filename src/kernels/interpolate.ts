import { GPU, IKernelFunctionThis } from 'gpu.js';
import { GraphDimensions, Color } from '../types/RealRendererTypes';

export interface IInterpolateKernelThis extends IKernelFunctionThis {
  constants: {
    xScaleFactor: number,
    yScaleFactor: number,
    xOffset: number,
    yOffset: number
  }
}

/**
 * @param gpu
 * @param dimensions
 * @param xScaleFactor
 * @param yScaleFactor
 * @param xOffset
 * @param yOffset
 */
export function getInterpolateKernel(
  gpu: GPU,
  dimensions: GraphDimensions,
  xScaleFactor: number,
  yScaleFactor: number,
  xOffset: number,
  yOffset: number
) {
  return gpu.createKernel(
    <any>`function(
      graphPixels,
      val1,
      val2,
      lineThickness,
      lineColor
    ) {
      const x = this.thread.x,
        y = this.thread.y;

      const outX = this.output.x, outY = this.output.y;

      const x1 = (val1[0] * this.constants.xScaleFactor) + outX * (this.constants.yOffset / 100);
      const y1 = (val1[1] * this.constants.yScaleFactor) + outY * (this.constants.xOffset / 100);

      const x2 = (val2[0] * this.constants.xScaleFactor) + outX * (this.constants.yOffset / 100);
      const y2 = (val2[1] * this.constants.yScaleFactor) + outY * (this.constants.xOffset / 100);

      let lineEqn = x * (y1 - y2) - x1 * (y1 - y2) - y * (x1 - x2) + y1 * (x1 - x2);
      let lineDist = Math.abs(lineEqn) / Math.sqrt((y1 - y2) * (y1 - y2) + (x1 - x2) * (x1 - x2));

      const lineSine = Math.abs(
        (y2 - y1) /
        Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
      )

      const lineCosine = Math.abs(
        (x2 - x1) /
        Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
      )

      const graphColor = graphPixels[this.thread.y][this.thread.x];

      if (
        (
          lineDist <= lineThickness + 1 &&
          x <= Math.max(x1, x2) + (lineThickness + 1) * lineSine &&
          x >= Math.min(x1, x2) - (lineThickness + 1) * lineSine &&
          y <= Math.max(y1, y2) + (lineThickness + 1) * lineCosine &&
          y >= Math.min(y1, y2) - (lineThickness + 1) * lineCosine
        )
      ) {
        let intensity = 0;

        // The following code basically blurs the line by convolving a simple average kernel
        // Very crude implementation of https://developer.nvidia.com/gpugems/gpugems2/part-iii-high-quality-rendering/chapter-22-fast-prefiltered-lines
        for (let i = x - 1; i <= x + 1; i++) {
          for (let j = y - 1; j <= y + 1; j++) {
            let lineEqn = i * (y1 - y2) - x1 * (y1 - y2) - j * (x1 - x2) + y1 * (x1 - x2);
            let lineDist = Math.abs(lineEqn) / Math.sqrt((y1 - y2) * (y1 - y2) + (x1 - x2) * (x1 - x2));

            intensity += (1 / 9) * Math.min(
              1,
              Math.floor(lineThickness / lineDist)
            )
          }
        }

        return [
          lineColor[0] * intensity + graphColor[0] * (1 - intensity),
          lineColor[1] * intensity + graphColor[1] * (1 - intensity),
          lineColor[2] * intensity + graphColor[2] * (1 - intensity)
        ]
      }
      else return graphColor;
    }`,
    {
      output: dimensions,
      pipeline: true,
      constants: {
        xScaleFactor,
        yScaleFactor,
        xOffset,
        yOffset
      },
      constantTypes: {
        xScaleFactor: 'Float',
        yScaleFactor: 'Float',
        xOffset: 'Float',
        yOffset: 'Float'
      }
    }
  )
}
