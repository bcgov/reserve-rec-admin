import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CustomerService } from './customer.service';
import { ApiService } from './api.service';
import { LoggerService } from './logger.service';

describe('CustomerService.getCustomerBySub', () => {
  let post: jest.Mock;
  let service: CustomerService;

  beforeEach(() => {
    post = jest.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: { post } },
        { provide: LoggerService, useValue: { error: jest.fn() } },
      ],
    });
    service = TestBed.inject(CustomerService);
  });

  it('asks users/search for an exact sub filter with no text query', async () => {
    post.mockReturnValue(of({ data: { hits: [] } }));

    await service.getCustomerBySub('sub-1');

    expect(post).toHaveBeenCalledWith('users/search', { 'sub.keyword': 'sub-1', size: 1 });
  });

  it('returns the hit with that sub', async () => {
    const row = { sub: 'sub-1', email: 'a@example.com', streetAddress: '1 Trail Rd' };
    post.mockReturnValue(of({ data: { hits: [row] } }));

    expect(await service.getCustomerBySub('sub-1')).toEqual(row);
  });

  it('returns null when the user is not indexed or a different row comes back', async () => {
    post.mockReturnValueOnce(of({ data: { hits: [] } }));
    post.mockReturnValueOnce(of({ data: { hits: [{ sub: 'sub-2' }] } }));

    expect(await service.getCustomerBySub('sub-1')).toBeNull();
    expect(await service.getCustomerBySub('sub-1')).toBeNull();
  });
});
