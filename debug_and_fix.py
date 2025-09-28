# Debug and fix invisible characters

with open('src/pages/FacultyDetail.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the exact line and show its hex representation
lines = content.split('\n')
for i, line in enumerate(lines):
    if 'option key={star}' in line:
        print(f"Line {i+1}: {repr(line)}")
        print(f"Hex: {line.encode('utf-8').hex()}")

# Now do a simple character-by-character replacement
# Find the problematic section and replace it entirely
start_marker = '{[1, 2, 3, 4, 5].map((star) => ('
end_marker = '))}'

start_idx = content.find(start_marker)
if start_idx != -1:
    # Find the end of this map function
    bracket_count = 0
    end_idx = start_idx + len(start_marker)
    
    for i, char in enumerate(content[end_idx:], end_idx):
        if char == '(':
            bracket_count += 1
        elif char == ')':
            bracket_count -= 1
            if bracket_count == -1:  # We found the closing of the map
                end_idx = i + 1
                break
    
    # Replace this entire section
    old_section = content[start_idx:end_idx]
    new_section = '''{[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-1 transition-all duration-200 hover:scale-110 ${
                        star <= rating 
                          ? 'text-yellow-400 hover:text-yellow-500' 
                          : 'text-slate-300 dark:text-slate-600 hover:text-yellow-300'
                      }`}
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    >
                      <Star 
                        size={24} 
                        fill={star <= rating ? 'currentColor' : 'none'}
                        className="transition-colors duration-200"
                      />
                    </button>
                  ))}'''
    
    content = content.replace(old_section, new_section, 1)  # Replace only first occurrence
    
    with open('src/pages/FacultyDetail.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Fixed the first star rating section by replacing the entire map function!")
else:
    print("Could not find the marker!")
