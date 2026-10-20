"use client";

// Màn hình mẫu: dự báo thời tiết 5 ngày (Ninh Bình) lấy từ API WeatherForecast
// qua tầng services + react-query, hiển thị bằng các UI shadcn đã thêm.

import { useQuery } from "@tanstack/react-query";
import { Droplets, Wind } from "lucide-react";
import { getWeatherForecast } from "@/services/weather";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function precipVariant(p: number): "destructive" | "secondary" | "outline" {
  if (p >= 60) return "destructive";
  if (p >= 30) return "secondary";
  return "outline";
}

export default function WeatherForecastList() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["weather-forecast"],
    queryFn: getWeatherForecast,
  });

  if (isError) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-destructive">
          Không tải được dữ liệu thời tiết:{" "}
          {error instanceof Error ? error.message : "lỗi không xác định"}.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dự báo thời tiết</CardTitle>
        <CardDescription>
          {isPending ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            `5 ngày tới · ${data.location}`
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ngày</TableHead>
              <TableHead>Thời tiết</TableHead>
              <TableHead className="text-right">Cao / Thấp</TableHead>
              <TableHead className="text-right">Mưa</TableHead>
              <TableHead className="text-right">Gió</TableHead>
              <TableHead className="text-right">Độ ẩm</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data.days.map((d) => (
                  <TableRow key={d.date}>
                    <TableCell className="font-medium">
                      <div>{d.dayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {d.date}
                      </div>
                    </TableCell>
                    <TableCell>{d.summary}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="font-medium">{d.highC}°</span>
                      <span className="text-muted-foreground"> / {d.lowC}°C</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={precipVariant(d.precipProbability)}>
                        {d.precipProbability}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      <span className="inline-flex items-center justify-end gap-1">
                        <Wind className="size-3.5" /> {d.windKph} km/h
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      <span className="inline-flex items-center justify-end gap-1">
                        <Droplets className="size-3.5" /> {d.humidity}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
