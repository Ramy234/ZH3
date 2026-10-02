update bev_facts
set
  source = 'TCS, 27 November 2025, about 130 used electric cars. Not a test price in this check.',
  url = 'https://www.tcs.ch/de/der-tcs/presse/medienmitteilungen-2025/e-occasionen-im-test.php',
  status = 'dated'
where key = 'battery';
