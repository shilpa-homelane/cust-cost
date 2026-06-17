import csv

def print_table():
    with open('calculation.csv', 'r') as f:
        reader = list(csv.reader(f))
        
        # Find MATERIAL CALCULATION section
        start_idx = 0
        for i, row in enumerate(reader):
            if 'MATERIAL CALCULATION ' in row:
                start_idx = i
                break
                
        for i in range(start_idx, min(start_idx + 40, len(reader))):
            row = reader[i]
            # Print non-empty columns with padding
            filtered = [str(x) for x in row if x.strip()]
            if filtered:
                print(" | ".join(f"{x:15}" for x in filtered))

if __name__ == '__main__':
    print_table()
