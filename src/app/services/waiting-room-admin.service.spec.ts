import { of } from 'rxjs';
import { WaitingRoomAdminService } from './waiting-room-admin.service';

describe('WaitingRoomAdminService.toggleMode2', () => {
  let post: jest.Mock;
  let service: WaitingRoomAdminService;

  beforeEach(() => {
    post = jest.fn().mockReturnValue(of({ data: { queueId: 'QUEUE#MODE2' } }));
    service = new WaitingRoomAdminService({ post } as any);
  });

  const options = { batchSize: 50, releaseIntervalSeconds: 300, releaseMode: 'auto' as const };

  it('sends firstReleaseAt when given', async () => {
    const firstReleaseAt = '2026-12-01T15:03:00.000Z';
    await service.toggleMode2(true, { ...options, firstReleaseAt });
    expect(post).toHaveBeenCalledWith('waiting-room/mode2', { active: true, ...options, firstReleaseAt });
  });

  it('omits firstReleaseAt when not given', async () => {
    await service.toggleMode2(true, options);
    expect(post.mock.calls[0][1]).toEqual({ active: true, ...options });
    expect(post.mock.calls[0][1]).not.toHaveProperty('firstReleaseAt');
  });

  it('sends only active when deactivating', async () => {
    await service.toggleMode2(false, { ...options, firstReleaseAt: '2026-12-01T15:03:00.000Z' });
    expect(post.mock.calls[0][1]).toEqual({ active: false });
  });
});
