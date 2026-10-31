import { ToastrService } from 'ngx-toastr';
import { ToastService, ToastTypes } from './toast.service';

describe('ToastService', () => {
  it('closes error toasts after a few seconds', () => {
    const toastr = { error: jest.fn(), success: jest.fn(), warning: jest.fn(), info: jest.fn() };
    const service = new ToastService(toastr as unknown as ToastrService);

    service.addMessage('boom', 'Failed', ToastTypes.ERROR);

    const opts = toastr.error.mock.calls[0][2];
    expect(opts.timeOut).toBeGreaterThan(0);
    expect(opts.timeOut).toBeLessThanOrEqual(10000);
    expect(opts.closeButton).toBe(true);
  });
});
