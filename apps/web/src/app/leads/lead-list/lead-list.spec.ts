import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { fixtureInterceptor, resetFixtureState } from '../../fixtures/fixture.interceptor';
import { LeadList } from './lead-list';

function rowCells(fixture: ComponentFixture<LeadList>, column: number): string[] {
  const rows = fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLElement>;
  return Array.from(rows).map((row) => {
    const cells = row.querySelectorAll('td');
    return (cells.item(column)?.textContent ?? '').trim();
  });
}

describe('LeadList', () => {
  let fixture: ComponentFixture<LeadList>;

  beforeEach(async () => {
    resetFixtureState();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([fixtureInterceptor])),
      ],
    });
    fixture = TestBed.createComponent(LeadList);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('renders one row per lead, sorted by inquiryDate descending by default', () => {
    const dates = rowCells(fixture, 5);
    expect(dates.length).toBe(10);
    expect(dates[0]).toBe('Aug 5, 2026');
    expect(dates[dates.length - 1]).toBe('May 30, 2026');
  });

  it('renders nullable columns as an em-dash, and never as "null" or blank', () => {
    const locations = rowCells(fixture, 3);
    const budgets = rowCells(fixture, 2);
    expect(locations).toContain('—');
    expect(budgets).toContain('—');
    expect(locations.every((text) => text.length > 0 && text !== 'null')).toBe(true);
    expect(budgets.every((text) => text.length > 0 && text !== 'null')).toBe(true);
  });

  it('re-sorts client-side, keeping unknown values at the bottom in both directions', () => {
    const budgetHeader = fixture.nativeElement.querySelectorAll(
      'thead .sort-button',
    )[2] as HTMLButtonElement;

    budgetHeader.click();
    fixture.detectChanges();
    const ascending = rowCells(fixture, 2);
    expect(ascending[0]).toBe('$220,000');
    expect(ascending[ascending.length - 1]).toBe('—');

    budgetHeader.click();
    fixture.detectChanges();
    const descending = rowCells(fixture, 2);
    expect(descending[0]).toBe('$100,000,000');
    // Nulls stay last: reversing must not bury the rows that carry data.
    expect(descending[descending.length - 1]).toBe('—');
  });
});
