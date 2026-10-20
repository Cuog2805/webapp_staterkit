namespace api
{
	// DTO tĩnh phục vụ màn hình mẫu (dữ liệu demo, không lấy từ DB).
	// Mô phỏng dự báo 5 ngày của AccuWeather cho Ninh Bình.
	public class WeatherForecast
	{
		public DateOnly Date { get; set; }

		public string DayName { get; set; } = string.Empty;

		public int HighC { get; set; }

		public int LowC { get; set; }

		public int HighF => 32 + (int)(HighC / 0.5556);

		public int LowF => 32 + (int)(LowC / 0.5556);

		public string Summary { get; set; } = string.Empty;

		// Xác suất mưa (%)
		public int PrecipProbability { get; set; }

		// Tốc độ gió (km/h)
		public int WindKph { get; set; }

		// Độ ẩm (%)
		public int Humidity { get; set; }
	}

	// Bọc danh sách dự báo kèm thông tin địa điểm.
	public class WeatherForecastResponse
	{
		public string Location { get; set; } = string.Empty;

		public IEnumerable<WeatherForecast> Days { get; set; } = [];
	}
}
