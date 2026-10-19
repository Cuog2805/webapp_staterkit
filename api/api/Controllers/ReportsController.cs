using api.Dtos;
using api.Models;
using api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = VaiTro.DieuHanh)]
public class ReportsController(ReportService reportService) : ControllerBase
{
    /// <summary>Báo cáo tổng hợp (B1), chỉ cho DIEU_HANH.</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<ReportSummaryDto>> Summary(
        [FromQuery] DateOnly? tuNgay = null, [FromQuery] DateOnly? denNgay = null)
    {
        return Ok(await reportService.SummaryAsync(tuNgay, denNgay));
    }
}
