export interface Author {
  displayName: string;
  url: string;
}

export const authors: Record<string, Author> = {
  nick: {
    displayName: 'Nick O\'Leary',
    url: 'https://github.com/knolleary',
  },
  dave: {
    displayName: 'Dave Conway-Jones',
    url: 'https://github.com/dceejay',
  },
};
