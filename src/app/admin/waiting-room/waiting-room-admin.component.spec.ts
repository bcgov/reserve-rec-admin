import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventEmitter } from '@angular/core';
import { BsModalService } from 'ngx-bootstrap/modal';
import { WaitingRoomAdminComponent } from './waiting-room-admin.component';
import { WaitingRoomAdminService } from '../../services/waiting-room-admin.service';
import { ToastService } from '../../services/toast.service';

describe('WaitingRoomAdminComponent Mode 2 first release', () => {
  let fixture: ComponentFixture<WaitingRoomAdminComponent>;
  let component: WaitingRoomAdminComponent;
  let wrService: any;
  let modalBody: string;
  let confirm: EventEmitter<void>;

  const HOUR = 3600 * 1000;
  // datetime-local value (local time, minute precision) for now + offsetMs
  const localValue = (offsetMs: number) => {
    const d = new Date(Date.now() + offsetMs);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  beforeEach(async () => {
    confirm = new EventEmitter<void>();
    modalBody = '';
    wrService = {
      listQueues: jest.fn().mockResolvedValue([]),
      getMode2Queue: jest.fn().mockResolvedValue(null),
      toggleMode2: jest.fn().mockResolvedValue({}),
    };
    const modalService = {
      show: jest.fn((_c: any, cfg: any) => {
        modalBody = cfg.initialState.body;
        return { hide: jest.fn(), content: { confirmButton: confirm } };
      }),
    };

    await TestBed.configureTestingModule({ imports: [WaitingRoomAdminComponent] })
      .overrideComponent(WaitingRoomAdminComponent, {
        set: { template: '', providers: [{ provide: BsModalService, useValue: modalService }] },
      })
      .overrideProvider(WaitingRoomAdminService, { useValue: wrService })
      .overrideProvider(ToastService, { useValue: { addMessage: jest.fn() } })
      .compileComponents();

    fixture = TestBed.createComponent(WaitingRoomAdminComponent);
    component = fixture.componentInstance;
  });

  async function activate() {
    await component.toggleMode2();
    confirm.emit();
    await fixture.whenStable();
  }

  it('blocks a past time with an error and never opens the confirm or calls the API', async () => {
    component.mode2FirstReleaseAt = localValue(-HOUR);
    await activate();
    expect(component.mode2FirstReleaseError).toMatch(/future/);
    expect(modalBody).toBe('');
    expect(wrService.toggleMode2).not.toHaveBeenCalled();
  });

  it('blocks a time more than 24 hours ahead', async () => {
    component.mode2FirstReleaseAt = localValue(25 * HOUR);
    await activate();
    expect(component.mode2FirstReleaseError).toMatch(/24 hours/);
    expect(wrService.toggleMode2).not.toHaveBeenCalled();
  });

  it('passes a valid time to the service as ISO and mentions it in the confirm text', async () => {
    const value = localValue(HOUR);
    component.mode2FirstReleaseAt = value;
    await activate();
    const iso = new Date(value).toISOString();
    expect(component.mode2FirstReleaseError).toBe('');
    expect(modalBody).toContain('The first batch goes out at');
    expect(wrService.toggleMode2).toHaveBeenCalledWith(true, expect.objectContaining({ firstReleaseAt: iso }));
  });

  it('activates without a first release time when the field is empty', async () => {
    await activate();
    expect(modalBody).not.toContain('first batch');
    expect(wrService.toggleMode2.mock.calls[0][1].firstReleaseAt).toBeUndefined();
  });

  it('ignores the field in manual mode, even with an invalid value', async () => {
    component.mode2ReleaseMode = 'manual';
    component.mode2FirstReleaseAt = localValue(-HOUR);
    await activate();
    expect(component.mode2FirstReleaseError).toBe('');
    expect(wrService.toggleMode2.mock.calls[0][1].firstReleaseAt).toBeUndefined();
  });

  it('shows the first release stat only while it is still ahead', () => {
    component.mode2Queue = { firstReleaseAt: new Date(Date.now() + HOUR).toISOString() } as any;
    expect(component.isFirstReleasePending()).toBe(true);
    component.mode2Queue = { firstReleaseAt: new Date(Date.now() - HOUR).toISOString() } as any;
    expect(component.isFirstReleasePending()).toBe(false);
    component.mode2Queue = {} as any;
    expect(component.isFirstReleasePending()).toBe(false);
  });
});
