import { avatarColorStore } from './AvatarColorStore';
import getGithubTheme from '../../../../helpers/get-github-theme';

import type { BarSeriesOption, EChartsOption } from 'echarts';
import { orderBy, take } from 'lodash-es';

const theme = getGithubTheme();
const DARK_TEXT_COLOR = 'rgba(230, 237, 243, 0.9)';

interface Node {
  id: string;
  n: string;
  c: string;
  i: number;
  r: number;
  v: number;
}

interface Link {
  s: string;  // Source node id
  t: string;  // Target node id
  w: number;  // Weight of the link
}

interface ApiResponse {
  nodes: Node[];
  links: Link[];
}

interface ExtractedNode {
  n: string;
  openrank: number;  // 仅包含 n 和 openrank
  date: string;      // 添加时间字段
}

// 获取数据函数
async function fetchData(year: string, month: string): Promise<{ nodes: ExtractedNode[] } | null> {
  // 构建 URL，动态修改年份和月份
  const URL = `https://oss.x-lab.info/open_digger/github/X-lab2017/open-digger/project_openrank_detail/${year}-${month}.json`;

  try {
    const response = await fetch(URL);
    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.statusText}`);
    }
    const data: ApiResponse = await response.json();

    // 提取 nodes 中的 n 和计算 openrank，并添加时间字段
    const extractedNodes: ExtractedNode[] = data.nodes.map(node => ({
      n: node.n,
      openrank: node.r * node.v,  // 计算 openrank
      date: `${year}-${month}`     // 添加时间字段
    }));

    return {
      nodes: extractedNodes,
    };
  } catch (error) {
    console.error('Failed to fetch data:', error);
    return null;
  }
}

// 获取数据并按月份分组
async function fetchAndFormatData(years: string[], months: string[]): Promise<void> {
  const allNodes: ExtractedNode[] = [];

  for (const year of years) {
    for (const month of months) {
      const data = await fetchData(year, month);
      if (data) {
        allNodes.push(...data.nodes);
      }
    }
  }

  // 将数据按月份分组
  const groupedNodes = allNodes.reduce((acc, node) => {
    if (!acc[node.date]) {
      acc[node.date] = [];
    }
    acc[node.date].push([node.n, node.openrank]);
    return acc;
  }, {} as Record<string, [string, number][]>);

  // 输出按月份分组后的数据
  console.log(JSON.stringify(groupedNodes, null, 2));
}

// 示例调用
fetchAndFormatData(['2023'], ['01']).then(() => {
  console.log('Data fetching and formatting completed.');
});
import type { BarSeriesOption, EChartsOption } from 'echarts';
import { orderBy, take } from 'lodash-es';

const theme = getGithubTheme();
const DARK_TEXT_COLOR = 'rgba(230, 237, 243, 0.9)';

// Define the type for grouped data
export interface groupedNodes {
  [key: string]: [string, number][];
}
export const getOption = async (
  groupedData: groupedNodes,
  month: string,
  speed: number,
  maxBars: number,
  enableAnimation: boolean
): Promise<EChartsOption> => {
  const updateFrequency = DEFAULT_FREQUENCY / speed;
  const rich: any = {};

  // Extract data for the specific month
  const data = groupedData[month] || [];
  const sortedData = orderBy(data, (item) => item[1], 'desc');
  const topData = take(sortedData, maxBars);

  const barData: BarSeriesOption['data'] = await Promise.all(
    topData.map(async (item) => {
      // rich name cannot contain special characters such as '-'
      rich[`avatar${item[0].replaceAll('-', '')}`] = {
        backgroundColor: {
          image: `https://avatars.githubusercontent.com/${item[0]}?s=48&v=4`,
        },
        height: 20,
      };
      const avatarColors = await avatarColorStore.getColors(item[0]);
      return {
        value: item,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              {
                offset: 0,
                color: avatarColors[0],
              },
              {
                offset: 0.5,
                color: avatarColors[1],
              },
            ],
            global: false,
          },
        },
      };
    })
  );

  return {
    grid: {
      top: 10,
      bottom: 30,
      left: 160,
      right: 50,
    },
    xAxis: {
      max: 'dataMax',
      axisLabel: {
        show: true,
        color: theme === 'light' ? undefined : DARK_TEXT_COLOR,
      },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      max: maxBars,
      axisLabel: {
        show: true,
        color: theme === 'light' ? undefined : DARK_TEXT_COLOR,
        fontSize: 14,
        formatter: function (value: string) {
          if (!value || value.endsWith('[bot]')) return value;
          return `${value} {avatar${value.replaceAll('-', '')}|}`;
        },
        rich,
      },
      axisTick: {
        show: false,
      },
      animationDuration: 0,
      animationDurationUpdate: enableAnimation ? 200 : 0,
    },
    series: [
      {
        realtimeSort: true,
        seriesLayoutBy: 'column',
        type: 'bar',
        data: barData,
        encode: {
          x: 1,
          y: 0,
        },
        label: {
          show: true,
          precision: 1,
          position: 'right',
          valueAnimation: true,
          fontFamily: 'monospace',
          color: theme === 'light' ? undefined : DARK_TEXT_COLOR,
        },
      },
    ],
    // Disable init animation.
    animationDuration: 0,
    animationDurationUpdate: enableAnimation ? updateFrequency : 0,
    animationEasing: 'linear',
    animationEasingUpdate: 'linear',
    graphic: {
      elements: [
        {
          type: 'text',
          right: 60,
          bottom: 60,
          style: {
            text: month,
            font: 'bolder 60px monospace',
            fill:
              theme === 'light' ? 'rgba(100, 100, 100, 0.3)' : DARK_TEXT_COLOR,
          },
          z: 100,
        },
      ],
    },
  };
};
