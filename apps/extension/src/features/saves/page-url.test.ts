import { describe, expect, it } from 'vitest';
import { domainOf, isWebsite, pageUrl } from './page-url';

describe('pageUrl', () => {
  it('drops the fragment, so a jump link finds the same saves', () => {
    expect(pageUrl('https://meadowquarterly.org/swarms?page=2#:~:text=scouts')).toBe(
      'https://meadowquarterly.org/swarms?page=2',
    );
  });
});

describe('isWebsite', () => {
  it('takes http and https pages only', () => {
    expect(isWebsite('https://example.com/')).toBe(true);
    expect(isWebsite('http://localhost:3000/library')).toBe(true);
    expect(isWebsite('about:newtab')).toBe(false);
    expect(isWebsite('file:///Users/me/notes.html')).toBe(false);
    expect(isWebsite(undefined)).toBe(false);
  });
});

describe('domainOf', () => {
  it('leaves out www.', () => {
    expect(domainOf('https://www.meadowquarterly.org/a')).toBe('meadowquarterly.org');
  });
});
