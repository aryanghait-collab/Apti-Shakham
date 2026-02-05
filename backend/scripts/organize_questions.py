"""
Script to organize questions.json:
1. Remove 1 easy question to get 35
2. Add 3 medium questions to get 35
3. Add 14 hard questions to get 35
4. Organize by difficulty level
"""
import json

# Load existing questions
with open('questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

# Separate by difficulty
easy = [q for q in questions if q.get('difficulty') == 1]
medium = [q for q in questions if q.get('difficulty') == 2]
hard = [q for q in questions if q.get('difficulty') == 3]

print(f"Before: Easy={len(easy)}, Medium={len(medium)}, Hard={len(hard)}")

# Trim easy to 35
easy = easy[:35]

# New medium questions to add (need 3 more)
new_medium = [
    {
        "text": "A train 150m long passes a pole in 15 seconds. What is its speed in km/h?",
        "options": [
            {"id": "a", "text": "30 km/h"},
            {"id": "b", "text": "36 km/h"},
            {"id": "c", "text": "40 km/h"},
            {"id": "d", "text": "45 km/h"}
        ],
        "correct_option_id": "b",
        "explanation": "Speed = 150/15 = 10 m/s = 10 × 3.6 = 36 km/h",
        "difficulty": 2
    },
    {
        "text": "If the HCF of two numbers is 12 and their LCM is 360, and one number is 60, find the other.",
        "options": [
            {"id": "a", "text": "60"},
            {"id": "b", "text": "72"},
            {"id": "c", "text": "84"},
            {"id": "d", "text": "90"}
        ],
        "correct_option_id": "b",
        "explanation": "HCF × LCM = Product of numbers → 12 × 360 = 60 × x → x = 72",
        "difficulty": 2
    },
    {
        "text": "The average of 5 consecutive odd numbers is 27. What is the largest number?",
        "options": [
            {"id": "a", "text": "29"},
            {"id": "b", "text": "31"},
            {"id": "c", "text": "33"},
            {"id": "d", "text": "35"}
        ],
        "correct_option_id": "b",
        "explanation": "Middle number = average = 27. Numbers: 23, 25, 27, 29, 31. Largest = 31",
        "difficulty": 2
    }
]

# New hard questions to add (need 14 more)
new_hard = [
    {
        "text": "A can complete a work in 10 days, B in 15 days, and C in 20 days. They start together but A leaves after 2 days. In how many more days will B and C finish the remaining work?",
        "options": [
            {"id": "a", "text": "4 days"},
            {"id": "b", "text": "5 days"},
            {"id": "c", "text": "6 days"},
            {"id": "d", "text": "7 days"}
        ],
        "correct_option_id": "b",
        "explanation": "Work in 2 days = 2(1/10 + 1/15 + 1/20) = 2(13/60) = 13/30. Remaining = 17/30. B+C rate = 7/60. Days = (17/30)/(7/60) = 34/7 ≈ 5 days",
        "difficulty": 3
    },
    {
        "text": "Two pipes A and B can fill a tank in 12 and 16 hours respectively. A third pipe C can empty it in 24 hours. If all three are opened together, how long to fill the tank?",
        "options": [
            {"id": "a", "text": "8 hours"},
            {"id": "b", "text": "9.6 hours"},
            {"id": "c", "text": "10 hours"},
            {"id": "d", "text": "12 hours"}
        ],
        "correct_option_id": "b",
        "explanation": "Net rate = 1/12 + 1/16 - 1/24 = (4+3-2)/48 = 5/48. Time = 48/5 = 9.6 hours",
        "difficulty": 3
    },
    {
        "text": "The compound interest on a certain sum for 2 years at 10% per annum is ₹525. Find the simple interest on the same sum for the same period.",
        "options": [
            {"id": "a", "text": "₹400"},
            {"id": "b", "text": "₹450"},
            {"id": "c", "text": "₹500"},
            {"id": "d", "text": "₹550"}
        ],
        "correct_option_id": "c",
        "explanation": "CI - SI = P × (r/100)² = P × 0.01. CI = 525, SI = P × 2 × 0.1. Solving: P = 2500, SI = 500",
        "difficulty": 3
    },
    {
        "text": "In a mixture of 60 liters, milk and water are in the ratio 2:1. How much water must be added to make the ratio 1:2?",
        "options": [
            {"id": "a", "text": "40 liters"},
            {"id": "b", "text": "50 liters"},
            {"id": "c", "text": "60 liters"},
            {"id": "d", "text": "80 liters"}
        ],
        "correct_option_id": "c",
        "explanation": "Milk = 40L, Water = 20L. For 1:2 ratio, 40/(20+x) = 1/2, so x = 60 liters",
        "difficulty": 3
    },
    {
        "text": "A shopkeeper marks his goods 40% above cost price but gives 25% discount. What is his profit percentage?",
        "options": [
            {"id": "a", "text": "5%"},
            {"id": "b", "text": "10%"},
            {"id": "c", "text": "15%"},
            {"id": "d", "text": "20%"}
        ],
        "correct_option_id": "a",
        "explanation": "Let CP = 100. MP = 140. SP = 140 × 0.75 = 105. Profit = 5%",
        "difficulty": 3
    },
    {
        "text": "The sum of first n natural numbers is 210. Find n.",
        "options": [
            {"id": "a", "text": "18"},
            {"id": "b", "text": "19"},
            {"id": "c", "text": "20"},
            {"id": "d", "text": "21"}
        ],
        "correct_option_id": "c",
        "explanation": "n(n+1)/2 = 210 → n(n+1) = 420 = 20 × 21 → n = 20",
        "difficulty": 3
    },
    {
        "text": "If 3^(x+2) = 243, what is the value of x?",
        "options": [
            {"id": "a", "text": "2"},
            {"id": "b", "text": "3"},
            {"id": "c", "text": "4"},
            {"id": "d", "text": "5"}
        ],
        "correct_option_id": "b",
        "explanation": "243 = 3⁵, so 3^(x+2) = 3⁵ → x+2 = 5 → x = 3",
        "difficulty": 3
    },
    {
        "text": "A wheel makes 1000 revolutions in covering a distance of 88 km. Find the radius of the wheel.",
        "options": [
            {"id": "a", "text": "7 m"},
            {"id": "b", "text": "14 m"},
            {"id": "c", "text": "21 m"},
            {"id": "d", "text": "28 m"}
        ],
        "correct_option_id": "b",
        "explanation": "Distance = 2πr × 1000 = 88000m. r = 88000/(2000π) = 44/π ≈ 14m",
        "difficulty": 3
    },
    {
        "text": "In a class, 60% students passed in Hindi, 70% in English. If 40% passed in both, what percentage failed in both?",
        "options": [
            {"id": "a", "text": "5%"},
            {"id": "b", "text": "10%"},
            {"id": "c", "text": "15%"},
            {"id": "d", "text": "20%"}
        ],
        "correct_option_id": "b",
        "explanation": "Passed in at least one = 60 + 70 - 40 = 90%. Failed in both = 10%",
        "difficulty": 3
    },
    {
        "text": "If the diagonal of a square is 10√2 cm, find its area.",
        "options": [
            {"id": "a", "text": "50 cm²"},
            {"id": "b", "text": "100 cm²"},
            {"id": "c", "text": "150 cm²"},
            {"id": "d", "text": "200 cm²"}
        ],
        "correct_option_id": "b",
        "explanation": "Diagonal = a√2 = 10√2, so a = 10. Area = a² = 100 cm²",
        "difficulty": 3
    },
    {
        "text": "A bag contains 5 red and 3 blue balls. Two balls are drawn at random. What is the probability that both are red?",
        "options": [
            {"id": "a", "text": "5/14"},
            {"id": "b", "text": "5/12"},
            {"id": "c", "text": "10/28"},
            {"id": "d", "text": "3/8"}
        ],
        "correct_option_id": "a",
        "explanation": "P = (5/8) × (4/7) = 20/56 = 5/14",
        "difficulty": 3
    },
    {
        "text": "Find the value of: 1² + 2² + 3² + ... + 10²",
        "options": [
            {"id": "a", "text": "355"},
            {"id": "b", "text": "385"},
            {"id": "c", "text": "415"},
            {"id": "d", "text": "455"}
        ],
        "correct_option_id": "b",
        "explanation": "Sum of squares = n(n+1)(2n+1)/6 = 10×11×21/6 = 385",
        "difficulty": 3
    },
    {
        "text": "The speed of a boat in still water is 15 km/h and the speed of stream is 3 km/h. The boat goes 36 km downstream and returns. Find total time taken.",
        "options": [
            {"id": "a", "text": "4 hours"},
            {"id": "b", "text": "4.5 hours"},
            {"id": "c", "text": "5 hours"},
            {"id": "d", "text": "5.5 hours"}
        ],
        "correct_option_id": "c",
        "explanation": "Downstream time = 36/18 = 2h. Upstream time = 36/12 = 3h. Total = 5 hours",
        "difficulty": 3
    },
    {
        "text": "If a:b = 2:3 and b:c = 4:5, find a:b:c.",
        "options": [
            {"id": "a", "text": "8:12:15"},
            {"id": "b", "text": "6:9:10"},
            {"id": "c", "text": "4:6:9"},
            {"id": "d", "text": "2:3:5"}
        ],
        "correct_option_id": "a",
        "explanation": "a:b = 2:3 = 8:12, b:c = 4:5 = 12:15. So a:b:c = 8:12:15",
        "difficulty": 3
    }
]

# Add new questions
medium.extend(new_medium)
hard.extend(new_hard)

# Trim to exactly 35 each
medium = medium[:35]
hard = hard[:35]

print(f"After: Easy={len(easy)}, Medium={len(medium)}, Hard={len(hard)}")

# Combine in order: Easy, Medium, Hard
organized = easy + medium + hard

# Save the organized questions
with open('questions.json', 'w', encoding='utf-8') as f:
    json.dump(organized, f, indent=4, ensure_ascii=False)

print(f"Total questions saved: {len(organized)}")
print("Questions organized: Easy (1-35), Medium (36-70), Hard (71-105)")
