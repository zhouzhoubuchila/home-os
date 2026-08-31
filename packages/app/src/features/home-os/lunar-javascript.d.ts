declare module 'lunar-javascript' {
  interface LunarDate {
    toString(): string;
    getYearInGanZhi(): string;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getYearShengXiao(): string;
    getJieQi(): string;
    getNextJieQi(): { getName(): string } | null;
    getDayYi(): string[];
    getDayJi(): string[];
  }

  interface SolarDate {
    getLunar(): LunarDate;
  }

  export const Solar: {
    fromDate(date: Date): SolarDate;
  };
}
