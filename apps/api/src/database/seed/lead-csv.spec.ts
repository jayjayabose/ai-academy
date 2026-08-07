import { parseSeedLeads } from './lead-csv';

const HEADER =
  'firstName,lastName,email,phone,status,budget,location,propertyType,bedrooms,source,inquiryDate,notes';

describe('reading a lead out of the seed CSV', () => {
  it('carries every column through to the row', () => {
    const [lead] = parseSeedLeads(
      `${HEADER}\nAda,Lovelace,ada@example.com,(303) 555-0193,qualified,480000,Littleton,condo,2,website,2026-06-05,Wants a south-facing balcony.`,
    );

    expect(lead).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '(303) 555-0193',
      status: 'qualified',
      budget: 480000,
      location: 'Littleton',
      propertyType: 'condo',
      bedrooms: 2,
      source: 'website',
      inquiryDate: '2026-06-05',
      notes: 'Wants a south-facing balcony.',
    });
  });

  it('turns an empty cell into null rather than an empty string', () => {
    // The distinction the importer turns on. '' would make `phone IS NULL` false
    // for a lead with no phone, and the wire contract types these as `T | null`.
    // The `land` rows in the real file are exactly this case: no bedrooms.
    const [lead] = parseSeedLeads(
      `${HEADER}\nAda,Lovelace,ada@example.com,,active,,,land,,,2026-06-05,`,
    );

    expect(lead).toMatchObject({
      phone: null,
      budget: null,
      location: null,
      bedrooms: null,
      source: null,
      notes: null,
    });
  });

  it('keeps a quoted note containing commas intact', () => {
    const [lead] = parseSeedLeads(
      `${HEADER}\nAda,Lovelace,ada@example.com,,active,,,condo,2,,2026-06-05,"Investor, not owner-occupied. Wants yield, not space."`,
    );

    expect(lead.notes).toBe(
      'Investor, not owner-occupied. Wants yield, not space.',
    );
  });

  it('reads budget as a number, not the string the file holds', () => {
    // INTEGER columns, and the wire contract says `budget: number`. A string here
    // would survive the insert and reappear as a string on the API.
    const [lead] = parseSeedLeads(
      `${HEADER}\nAda,Lovelace,ada@example.com,,active,480000,,condo,2,,2026-06-05,`,
    );

    expect(lead.budget).toBe(480000);
    expect(lead.bedrooms).toBe(2);
  });

  describe('rejecting a row the schema would reject', () => {
    // Naming the line matters: without it a bad row surfaces as a 23514 from a
    // bulk insert of 100 rows, which then rolls back, telling you nothing about
    // which row was at fault.

    it('names the line and the value for a status outside the union', () => {
      expect(() =>
        parseSeedLeads(
          `${HEADER}\nAda,Lovelace,ada@example.com,,archived,,,condo,2,,2026-06-05,`,
          'seed-leads.csv',
        ),
      ).toThrow('seed-leads.csv:2: status "archived" is not one of');
    });

    it('names the line for a property type outside the union', () => {
      expect(() =>
        parseSeedLeads(
          `${HEADER}\nAda,Lovelace,ada@example.com,,active,,,houseboat,2,,2026-06-05,`,
          'seed-leads.csv',
        ),
      ).toThrow('seed-leads.csv:2: propertyType "houseboat" is not one of');
    });

    it('rejects a missing email rather than inserting an empty one', () => {
      expect(() =>
        parseSeedLeads(
          `${HEADER}\nAda,Lovelace,,,active,,,condo,2,,2026-06-05,`,
          'seed-leads.csv',
        ),
      ).toThrow('seed-leads.csv:2: email is required but empty.');
    });

    it('rejects a budget that is not a whole number', () => {
      expect(() =>
        parseSeedLeads(
          `${HEADER}\nAda,Lovelace,ada@example.com,,active,480k,,condo,2,,2026-06-05,`,
          'seed-leads.csv',
        ),
      ).toThrow('seed-leads.csv:2: budget must be a whole number, got "480k".');
    });

    it('rejects an inquiryDate that is not YYYY-MM-DD', () => {
      expect(() =>
        parseSeedLeads(
          `${HEADER}\nAda,Lovelace,ada@example.com,,active,,,condo,2,,06/05/2026,`,
          'seed-leads.csv',
        ),
      ).toThrow(
        'seed-leads.csv:2: inquiryDate must be YYYY-MM-DD, got "06/05/2026".',
      );
    });

    it('counts lines from the header, so the number matches what an editor shows', () => {
      const rows = [
        'Ada,Lovelace,ada@example.com,,active,,,condo,2,,2026-06-05,',
        'Rosa,Santos,rosa@example.com,,contacted,,,condo,2,,2026-06-05,',
        'Wei,Kaur,wei@example.com,,not-a-status,,,condo,2,,2026-06-05,',
      ];

      expect(() =>
        parseSeedLeads(`${HEADER}\n${rows.join('\n')}`, 'seed-leads.csv'),
      ).toThrow('seed-leads.csv:4:');
    });
  });

  it('refuses a file with a header and nothing else', () => {
    // Silently seeding zero leads would leave `npm run setup` reporting success
    // against an empty dashboard.
    expect(() => parseSeedLeads(HEADER, 'seed-leads.csv')).toThrow(
      'seed-leads.csv contains no data rows.',
    );
  });
});
