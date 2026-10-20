// Service mẫu cho API WeatherForecast (GET /WeatherForecast).
// Đây là khuôn mẫu cho các service khác: khai báo kiểu dữ liệu trả về,
// rồi export hàm nghiệp vụ gọi qua `request`. Page/component chỉ cần
// `import { getWeatherForecast } from "@/services/weather"`.

import { request } from "./http";

export interface WeatherForecast {
  date: string; // DateOnly serialize thành "yyyy-MM-dd"
  dayName: string;
  highC: number;
  lowC: number;
  highF: number;
  lowF: number;
  summary: string;
  precipProbability: number; // %
  windKph: number;
  humidity: number; // %
}

export interface WeatherForecastResponse {
  location: string;
  days: WeatherForecast[];
}

export function getWeatherForecast(): Promise<WeatherForecastResponse> {
  return request<WeatherForecastResponse>("/WeatherForecast");
}
