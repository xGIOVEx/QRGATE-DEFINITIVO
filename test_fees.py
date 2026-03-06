import math

def calculate_fee(price, has_slot=False):
    if has_slot:
        return 1.49 + (price * 0.01)
    else:
        return 0.49 + (price * 0.06)

def calculate_guide_fee(price, is_premium=False, num_extra_langs=0, qty=1):
    rate = 0.40 if is_premium else 0.35
    base_fee = (price * rate) * qty
    extra_fee = (0.30 * num_extra_langs) * qty
    return round(base_fee + extra_fee, 2)

def calculate_ai_cap(price):
    return math.floor((price * 0.50) / 0.20)

# Scenarios
print("--- TICKETING ---")
p1 = 10.00
f1 = calculate_fee(p1)
print(f"Ticket {p1}: fee {f1}, net {p1-f1}") # Target: 1.09, 8.91

p2 = 5.00
f2 = calculate_fee(p2)
print(f"Ticket {p2}: fee {f2}, net {p2-f2}") # Target: 0.79, 4.21

p3 = 15.00
f3 = calculate_fee(p3, has_slot=True)
print(f"Ticket {p3} (slot): fee {f3}, net {p3-f3}") # Target: 1.64, 13.36

print("\n--- AUDIO GUIDE ---")
gp1 = 4.00
gf1 = calculate_guide_fee(gp1)
print(f"Guide {gp1}: fee {gf1}, net {gp1-gf1}") # Target: 1.40, 2.60

gp2 = 4.00
gf2 = calculate_guide_fee(gp2, num_extra_langs=1)
print(f"Guide {gp2} (FR): fee {gf2}, net {gp2-gf2}") # Target: 1.70, 2.30

gp3 = 5.00
gf3 = calculate_guide_fee(gp3, is_premium=True)
print(f"Guide {gp3} (Premium): fee {gf3}, net {gp3-gf3}") # Target: 2.00, 3.00

print(f"AI Cap {gp1}: {calculate_ai_cap(gp1)}") # Target: 10
print(f"AI Cap 3.50: {calculate_ai_cap(3.50)}") # Target: 8

print("\n--- GROUP ORDER ---")
# 4 tickets 10 + 4 guides 4 IT
total_fee = (calculate_fee(10.00) * 4) + calculate_guide_fee(4.00, qty=4)
total_gross = (10.00 * 4) + (4.00 * 4)
print(f"Group: total fee {total_fee}, total net {total_gross - total_fee}") # Target: 9.96, 46.04
