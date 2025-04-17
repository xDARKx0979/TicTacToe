#!/bin/bash

# List of game HTML files to update
GAMES=(
  "papas-donuteria.html"
  "papas-freezeria.html"
  "papas-hotdoggeria.html"
  "papas-pizzeria.html"
  "papas-pancakeria.html"
  "papas-pastaria.html"
  "papas-scooperia.html"
  "papas-sushiria.html"
  "papas-tacomia.html"
  "papas-wingeria.html"
)

# CSS styles for the support button
SUPPORT_STYLES='        .support-button {
            position: fixed;
            top: 10px;
            right: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            background: #f96854;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            text-decoration: none;
            font-weight: bold;
            font-size: 14px;
            z-index: 1000;
            transition: transform 0.2s;
        }
        
        .support-button:hover {
            transform: translateY(-2px);
        }
        
        .support-button svg {
            width: 20px;
            height: 20px;
        }'

# HTML for the support button
SUPPORT_BUTTON='    <a href="https://patreon.com/Dark0979?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink" target="_blank" class="support-button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14.82 2.41c3.96 0 7.18 3.22 7.18 7.18 0 3.96-3.22 7.18-7.18 7.18-3.96 0-7.18-3.22-7.18-7.18 0-3.96 3.22-7.18 7.18-7.18zM2 21.6h5.5V2.41H2V21.6z"/>
        </svg>
        Support Creator
    </a>
'

# Loop through each game file
for game in "${GAMES[@]}"; do
  if [ -f "games/$game" ]; then
    echo "Updating $game..."
    
    # Add the CSS styles before the end of the style section
    sed -i "" "s/    <\/style>/\n$SUPPORT_STYLES\n    <\/style>/" "games/$game"
    
    # Add the support button after the body tag
    sed -i "" "s/<body>/<body>\n$SUPPORT_BUTTON/" "games/$game"
    
    echo "Updated $game successfully"
  else
    echo "Warning: games/$game does not exist"
  fi
done

echo "All files updated!" 