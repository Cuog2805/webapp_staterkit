using api.Models;
using api.Services.Workflow;

namespace api.Tests;

public class OrderStateMachineTests
{
    [Fact]
    public void ChuyenHopLe_DieuHanh_TiepNhan()
    {
        var input = new TransitionInput(
            From: TrangThaiDon.Moi, To: TrangThaiDon.DaTiepNhan,
            ActorRole: VaiTro.DieuHanh, ActorIsOwner: false, ActorIsAssignedKtv: false,
            LyDo: null, KtvProvidedAndValid: false);

        var result = OrderStateMachine.Validate(input);

        Assert.True(result.Ok);
    }

    [Fact]
    public void ChuyenKhongCoTrongBang_TraVe422()
    {
        var input = new TransitionInput(
            From: TrangThaiDon.Moi, To: TrangThaiDon.HoanTat,
            ActorRole: VaiTro.DieuHanh, ActorIsOwner: false, ActorIsAssignedKtv: false,
            LyDo: null, KtvProvidedAndValid: false);

        var result = OrderStateMachine.Validate(input);

        Assert.False(result.Ok);
        Assert.Equal(422, result.HttpStatus);
        Assert.Equal("INVALID_TRANSITION", result.Code);
    }

    [Fact]
    public void SaiVaiTro_TraVe403()
    {
        // Khách hàng không được tiếp nhận đơn (chỉ DIEU_HANH).
        var input = new TransitionInput(
            From: TrangThaiDon.Moi, To: TrangThaiDon.DaTiepNhan,
            ActorRole: VaiTro.KhachHang, ActorIsOwner: true, ActorIsAssignedKtv: false,
            LyDo: null, KtvProvidedAndValid: false);

        var result = OrderStateMachine.Validate(input);

        Assert.False(result.Ok);
        Assert.Equal(403, result.HttpStatus);
    }

    [Fact]
    public void Huy_ThieuLyDo_TraVe422()
    {
        var input = new TransitionInput(
            From: TrangThaiDon.Moi, To: TrangThaiDon.Huy,
            ActorRole: VaiTro.KhachHang, ActorIsOwner: true, ActorIsAssignedKtv: false,
            LyDo: null, KtvProvidedAndValid: false);

        var result = OrderStateMachine.Validate(input);

        Assert.False(result.Ok);
        Assert.Equal(422, result.HttpStatus);
        Assert.Equal("REASON_REQUIRED", result.Code);
    }
}
