import { Utils } from './utils';

describe('Utils', () => {
  const utils = new Utils();

  it('converts array into object for typeahead', async () => {
    const array = [
      { name: 'item1', key: 'item1' },
      { name: 'item2', key: 'item2' },
      { name: 'item3', key: 'item3' },
    ];
    const valueToUseAsKey = 'key';
    const valueToUseForTypeAhead = 'name';
    const res: any = utils.convertArrayIntoObjForTypeAhead(
      array,
      valueToUseAsKey,
      valueToUseForTypeAhead
    );
    expect(res).toEqual({
      typeAheadData: ['item1', 'item2', 'item3'],
      item1: { name: 'item1', key: 'item1' },
      item2: { name: 'item2', key: 'item2' },
      item3: { name: 'item3', key: 'item3' },
    });
  });

  it('converts array into object for select', async () => {
    const array = [
      { name: 'item1', id: 'item1', label: 'item1' },
      { name: 'item2', id: 'item2', label: 'item2' },
      { name: 'item3', id: 'item3', label: 'item3' },
    ];
    const valueToUseAsKey = 'id';
    const valueToUseForSelectId = 'id';
    const valueToUseForSelectLabel = 'label';
    const res: any = utils.convertArrayIntoObjForSelect(
      array,
      valueToUseAsKey,
      valueToUseForSelectId,
      valueToUseForSelectLabel
    );
    expect(res).toEqual({
      selectData: [
        { id: 'item1', label: 'item1' },
        { id: 'item2', label: 'item2' },
        { id: 'item3', label: 'item3' },
      ],
      item1: { name: 'item1', id: 'item1', label: 'item1' },
      item2: { name: 'item2', id: 'item2', label: 'item2' },
      item3: { name: 'item3', id: 'item3', label: 'item3' },
    });
  });

  it('converts various dates', async () => {
    // we cannot test any tz-respecting functions as we cannot guarantee which tz
    // these tests will run in.
    const date = new Date();
    date.setMonth(11);
    date.setDate(31);
    date.setFullYear(2014);
    // convertJSDateToNGBDate
    const NGBDate = utils.convertJSDateToNGBDate(date);
    expect(NGBDate).toEqual({ year: 2014, month: 12, day: 31 });
    expect(utils.convertJSDateToNGBDate(undefined)).toBeNull();
    // convertJSDateToYYYYMM
    const YYYYMM = utils.convertJSDateToYYYYMM(date);
    expect(YYYYMM).toBe('201412');
    // convertYYYYMMToJSDate
    const JSDate = utils.convertYYYYMMToJSDate(YYYYMM);
    expect(JSDate).toEqual(new Date(2014, 11));
    // convertYYYYMMToMMMMYYYY
    const MMMMYYYY = utils.convertYYYYMMToMMMMYYYY(YYYYMM);
    expect(MMMMYYYY).toEqual('December 2014');
    // convertJSDateToShortDate
    const shortDate = utils.convertJSDateToShortDate(date);
    expect(shortDate).toEqual('2014-12-31');
    // convertShortDateToJSDate
    const aJSDate = utils.convertShortDateToJSDate('2014-12-31');
    expect(aJSDate).toEqual(new Date('2014, 12, 31'));
    // convert24hTo12hTime
    expect(utils.convert24hTo12hTime(0)).toEqual({ hour: '12', amPm: 'AM' });
    expect(utils.convert24hTo12hTime(6)).toEqual({ hour: '6', amPm: 'AM' });
    expect(utils.convert24hTo12hTime(12)).toEqual({ hour: '12', amPm: 'PM' });
    expect(utils.convert24hTo12hTime(18)).toEqual({ hour: '6', amPm: 'PM' });
    // convert12hTo24hTime
    expect(utils.convert12hTo24hTime('12', 'AM')).toEqual(0);
    expect(utils.convert12hTo24hTime('6', 'AM')).toEqual(6);
    expect(utils.convert12hTo24hTime('12', 'PM')).toEqual(12);
    expect(utils.convert12hTo24hTime('6', 'PM')).toEqual(18);
    // createShortDateInterval
    expect(utils.createShortDateInterval('2023-01-01', '2023-01-01')).toEqual(['2023-01-01']);
    expect(utils.createShortDateInterval('2023-01-01', '2023-01-03')).toEqual(['2023-01-01', '2023-01-02', '2023-01-03']);
  });

  it('handles various utils', async () => {
    // capitalizeFirstLetter
    expect(utils.capitalizeFirstLetter('string')).toEqual('String');
    // buildInnerHTMLRow
    // single row
    expect(utils.buildInnerHTMLRow(['<p>test</p>'])).toContain(
      '<div class="col mb-4"><p>test</p></div>'
    );
  });
});
