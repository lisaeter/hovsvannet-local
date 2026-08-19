from datetime import datetime, timezone

def print_date(year, month, day, hour=0, minute=0, second=0):
    date = datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc)
    timestamp = int(date.timestamp())
    print(timestamp)

print_date(2024, 6, 1)
print_date(2024, 6, 2)
