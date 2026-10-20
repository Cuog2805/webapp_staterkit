using Microsoft.AspNetCore.Mvc;

namespace api.Controllers
{
	[ApiController]
	[Route("[controller]")]
	public class WeatherForecastController : ControllerBase
	{
		// Dữ liệu tĩnh mẫu: dự báo 5 ngày cho Ninh Bình (mô phỏng AccuWeather).
		// Offset tính từ "hôm nay" để ngày luôn hiện hành; nội dung cố định.
		private static readonly (int DayOffset, int HighC, int LowC, string Summary, int Precip, int Wind, int Humidity)[] Sample =
		[
			(0, 29, 23, "Partly sunny", 25, 11, 78),
			(1, 31, 24, "Mostly sunny", 10, 9, 72),
			(2, 30, 24, "A thunderstorm in spots", 55, 14, 85),
			(3, 27, 23, "Cloudy with showers", 70, 16, 88),
			(4, 28, 23, "Partly cloudy", 40, 12, 80),
		];

		[HttpGet(Name = "GetWeatherForecast")]
		public WeatherForecastResponse Get()
		{
			var today = DateOnly.FromDateTime(DateTime.Now);

			var days = Sample.Select(s =>
			{
				var date = today.AddDays(s.DayOffset);
				return new WeatherForecast
				{
					Date = date,
					DayName = date.DayOfWeek.ToString(),
					HighC = s.HighC,
					LowC = s.LowC,
					Summary = s.Summary,
					PrecipProbability = s.Precip,
					WindKph = s.Wind,
					Humidity = s.Humidity,
				};
			});

			return new WeatherForecastResponse
			{
				Location = "Ninh Binh, Vietnam",
				Days = days,
			};
		}
	}
}
