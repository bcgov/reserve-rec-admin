import { csvField } from './utils';

describe('csvField', () => {
  it('leaves plain text alone', () => {
    expect(csvField('Jane Camper')).toBe('Jane Camper');
  });

  it('writes nothing for a missing value', () => {
    expect(csvField(undefined)).toBe('');
    expect(csvField(null)).toBe('');
  });

  it('quotes text with a comma, quote or line break', () => {
    expect(csvField('Camper, Jane')).toBe('"Camper, Jane"');
    expect(csvField('Jane "JC" Camper')).toBe('"Jane ""JC"" Camper"');
    expect(csvField('12 Main St\nUnit 4')).toBe('"12 Main St\nUnit 4"');
  });

  it('keeps a spreadsheet from running a value as a formula', () => {
    expect(csvField('=HYPERLINK("http://example.com")')).toBe('"\'=HYPERLINK(""http://example.com"")"');
    expect(csvField('+12505550100')).toBe("'+12505550100");
    expect(csvField('-1')).toBe("'-1");
    expect(csvField('@SUM(A1)')).toBe("'@SUM(A1)");
  });
});
