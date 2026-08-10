/** WMO 天气码 → 中文 */
export function weatherText(code: number): string {
  if (code === 0) return "晴";
  if (code <= 2) return "多云";
  if (code === 3) return "阴";
  if (code === 45 || code === 48) return "雾";
  if (code <= 57) return "毛毛雨";
  if (code <= 67) return "雨";
  if (code <= 77) return "雪";
  if (code <= 82) return "阵雨";
  if (code <= 86) return "阵雪";
  return "雷阵雨";
}
