import WeatherForecastList from "@/app/components/WeatherForecastList";
import ThemeToggle from "@/app/components/ThemeToggle";

export default function WeatherPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Thời tiết Ninh Bình</h1>
          <p className="text-sm text-muted-foreground">
            Màn hình mẫu dùng shadcn/ui + React Query + tầng services.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <WeatherForecastList />
    </main>
  );
}
