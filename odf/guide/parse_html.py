from bs4 import BeautifulSoup
import re
import uuid
import bs4
import os
from datetime import datetime

def slugify(text):
    """Convert text to URL-friendly slug"""
    # Convert to lowercase and replace spaces with hyphens
    text = text.lower().strip()
    # Remove special characters
    text = re.sub(r'[^\w\s-]', '', text)
    # Replace whitespace with single hyphen
    text = re.sub(r'[-\s]+', '-', text)
    return text

def highlight_odf_syntax(content):
    """Add syntax highlighting classes to ODF code"""
    # Split into lines for processing
    lines = content.splitlines()
    highlighted_lines = []
    
    for line in lines:
        # Highlight section headers [SectionName]
        if re.match(r'^\[.*\]$', line):
            line = f'<span class="text-warning">{line}</span>'
        # Highlight property assignments
        elif '=' in line:
            parts = line.split('=', 1)
            property_name = parts[0].strip()
            property_value = parts[1].strip()
            
            # Handle comments after the value
            if '//' in property_value:
                value_parts = property_value.split('//', 1)
                value = value_parts[0].strip()
                comment = value_parts[1].strip()
                line = f'<span class="text-info">{property_name}</span> = <span class="text-light">{value}</span> <span class="text-secondary">//{comment}</span>'
            else:
                line = f'<span class="text-info">{property_name}</span> = <span class="text-light">{property_value}</span>'
        
        highlighted_lines.append(line)
    
    return '\n'.join(highlighted_lines)

def remove_br_tags(content):
    """Remove all <br> tags from content"""
    return re.sub(r'<br\s*/?>', '', str(content))

def prettify_html(soup):
    """Custom prettify function that uses 4-space indentation"""
    # Get the basic prettified version
    pretty = soup.prettify()
    
    # Split into lines
    lines = pretty.split('\n')
    
    # Replace the 2-space indents with 4-space indents
    indented = []
    for line in lines:
        # Count leading spaces
        leading_spaces = len(line) - len(line.lstrip())
        # Double the indentation
        new_indent = ' ' * (leading_spaces * 2)
        # Add the line with new indentation
        indented.append(new_indent + line.lstrip())
    
    return '\n'.join(indented)

def convert_bb_code(code_block):
    """Convert BB code blocks to Bootstrap pre/code blocks"""
    # Get the raw content including newlines
    content = str(code_block)
    
    # Extract the text content while preserving newlines
    # Remove the opening div tag
    content = re.sub(r'^<div[^>]*>', '', content)
    # Remove the closing div tag
    content = re.sub(r'</div>$', '', content)
    
    # Remove <br> tags
    content = remove_br_tags(content)
    
    # Split into lines, clean each line's whitespace, and rejoin
    lines = content.splitlines()
    cleaned_lines = [line.strip() for line in lines]
    content = '\n'.join(cleaned_lines)
    
    # If there's only one line and it ends with a newline followed immediately by the end,
    # we can trim that final newline
    if content.count('\n') == 1 and content.rstrip() == content.rstrip('\n'):
        content = content.rstrip()
    
    # Apply syntax highlighting
    highlighted_content = highlight_odf_syntax(content)
    
    raw_html = f'''<div class="code-snippet w-100">
        <pre class="mb-0"><code class="text-light bg-secondary-subtle p-2 rounded d-block">{highlighted_content}</code></pre>
    </div>'''
    
    # Parse and prettify
    soup = bs4.BeautifulSoup(raw_html, 'html.parser')
    return prettify_html(soup)

def convert_bb_ul(ul_block, is_nested=False):
    """Convert BB unordered lists to Bootstrap lists"""
    # Process any nested elements first
    for h1 in ul_block.find_all('div', class_='bb_h1'):
        h1.replace_with(bs4.BeautifulSoup(convert_bb_h1(h1), 'html.parser'))
    
    # Process any nested lists
    for nested_ul in ul_block.find_all('ul', class_='bb_ul'):
        if nested_ul != ul_block:  # Skip self to avoid infinite recursion
            nested_ul.replace_with(bs4.BeautifulSoup(convert_bb_ul(nested_ul, is_nested=True), 'html.parser'))
    
    # Check if any list items contain headers
    has_headers = any(li.find(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div.bb_h1']) 
                     for li in ul_block.find_all('li', recursive=False))
    
    if has_headers:
        # For lists with headers, just concatenate the contents of each li
        content = ''
        for li in ul_block.find_all('li', recursive=False):
            content += str(li.decode_contents())
        return content
    else:
        # For regular lists, keep the ul/li structure
        content = ul_block.decode_contents()
        raw_html = f'''<ul class="mb-3">{content}</ul>'''
        soup = bs4.BeautifulSoup(raw_html, 'html.parser')
        return prettify_html(soup)

def convert_bb_h1(h1_block):
    """Convert BB h1 blocks to Bootstrap headings"""
    raw_html = f'''<h3 class="mb-3 text-info">{h1_block.text.strip()}</h3>'''
    soup = bs4.BeautifulSoup(raw_html, 'html.parser')
    return prettify_html(soup)

def convert_subsection(section):
    """Convert a subsection to Bootstrap card"""
    title = section.find('div', class_='subSectionTitle').text.strip()
    section_id = slugify(title)
    desc = section.find('div', class_='subSectionDesc')
    
    # Convert all code blocks
    for code in desc.find_all('div', class_='bb_code'):
        code.replace_with(bs4.BeautifulSoup(convert_bb_code(code), 'html.parser'))
    
    # Convert all h1 blocks that aren't inside lists
    for h1 in desc.find_all('div', class_='bb_h1', recursive=False):
        h1.replace_with(bs4.BeautifulSoup(convert_bb_h1(h1), 'html.parser'))
    
    # Convert all lists, marking top-level lists
    for ul in desc.find_all('ul', class_='bb_ul', recursive=False):
        ul.replace_with(bs4.BeautifulSoup(convert_bb_ul(ul, is_nested=False), 'html.parser'))
    
    # Convert links to Bootstrap style
    for link in desc.find_all('a', class_='bb_link'):
        link['class'] = 'text-info text-decoration-none'
        link['target'] = '_blank'
        link['rel'] = 'noopener'
    
    return {
        'id': section_id,
        'title': title,
        'content': str(desc.decode_contents())
    }

def generate_page_html(section, all_sections):
    """Generate full HTML page for a section"""
    # Generate table of contents HTML
    toc_html = '<div class="list-group list-group-flush small">'
    for s in all_sections:
        active_class = ' active text-bg-primary' if s['id'] == section['id'] else ''
        toc_html += f'''<a href="/odf/guide/{s['id']}/" 
           class="list-group-item list-group-item-action d-flex justify-content-between align-items-center{active_class}">
            {s['title']}
        </a>'''
    toc_html += '</div>'
    
    raw_html = f'''<!DOCTYPE html>
<html lang="en" data-bs-theme="dark" class="h-100">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{section['title']} - Battlezone II: ODF Guide</title>
        
        <meta property="description" content="ODF reference guide for Battlezone II: Combat Commander">
        <meta property="og:site_name" content="bz2vsr.com/odf/guide/{section['id']}"/>
        <meta property="og:image" content="https://bz2vsr.com/img/default_pfp.png" />
        <meta property="og:description" content="ODF reference guide for Battlezone II: Combat Commander" />
        <meta property="og:title" content="{section['title']} - Battlezone II: ODF Guide" />
        
        <link rel="stylesheet" href="/css/bootstrap.min.css">
        <link rel="stylesheet" href="/css/main.css">
    </head>
    <body id="ODFGuide" class="d-flex flex-column h-100">
        <nav class="navbar navbar-expand navbar-dark">
            <div class="container">
                <a class="navbar-brand">
                    <img src="/img/logo.png" class="img-fluid ms-2 me-1" height="32" width="32">
                    <span class="d-none d-lg-inline">ODF Guide</span>
                </a>
                <div class="d-none d-lg-block">
                    <a href="/" class="btn btn-success">
                        Return Home
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-house-door-fill mb-1" viewBox="0 0 16 16">
                            <path d="M6.5 14.5v-3.505c0-.245.25-.495.5-.495h2c.25 0 .5.25.5.5v3.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5"/>
                        </svg>
                    </a>
                </div>
            </div>
        </nav>
        <div class="container pb-3">
            <div class="row">
                <div class="alert alert-warning mt-2" role="alert">
                    This is a raw, verbatim copy of GBD's
                    <a class="alert-link" style="display:inline-block;"href="https://steamcommunity.com/sharedfiles/filedetails/?id=1423355866">ODF Guide</a> on Steam.
                    Plan is to improve it over time with <a class="alert-link" style="display:inline-block;"href="https://jekyllrb.com/">Jekyll</a> and <a class="alert-link" style="display:inline-block;"href="https://www.algolia.com/">Algolia</a>.
                </div>
                <!-- Left sidebar -->
                <div class="col-3 p-3">
                    <div id="sidebar-wrapper">
                        <h6 class="text-secondary mb-2 fw-bold">Table of Contents</h6>
                        <div id="toc-container">
                            {toc_html}
                        </div>
                    </div>
                </div>
                
                <!-- Main content -->
                <div class="col-7 p-3">
                    <div id="content">
                        <div class="card">
                            <div class="card-header bg-secondary-subtle sticky-top">
                                <h3 class="mb-0 fw-500">{section['title']}</h3>
                            </div>
                            <div class="card-body content-scroll">
                                {section['content']}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right sidebar -->
                <div class="col-2 p-3">
                    <div id="section-toc" class="sticky-top pt-3">
                        <h6 class="text-secondary mb-2 fw-bold">On this page</h6>
                        <hr class="mt-0">
                        <div id="current-section-toc"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <script src="/js/bootstrap.bundle.min.js"></script>
        <script src="/js/odf_guide.js"></script>
    </body>
</html>'''

    # Parse and prettify
    soup = bs4.BeautifulSoup(raw_html, 'html.parser')
    return prettify_html(soup)

def main():
    # Get the directory this script is in
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting file generation...")
    
    # Read the template from src subdirectory
    input_path = os.path.join(script_dir, 'src', 'guide.html')
    with open(input_path, 'r', encoding='utf-8') as f:
        guide_html = f.read()
    
    # Parse the HTML
    soup = bs4.BeautifulSoup(guide_html, 'html.parser')
    
    # Get all subsections
    subsections = soup.find_all('div', class_='subSection')
    
    # Convert each subsection
    converted = [convert_subsection(section) for section in subsections]
    
    # Create directory for each section and generate its index.html
    folder_count = 0
    file_count = 0
    for section in converted:
        section_dir = os.path.join(script_dir, section['id'])
        os.makedirs(section_dir, exist_ok=True)
        folder_count += 1
        
        index_path = os.path.join(section_dir, 'index.html')
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(generate_page_html(section, converted))
        file_count += 1
    
    # Generate root index.html with redirect
    root_index = f'''<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="refresh" content="0; url=/odf/guide/introduction/">
        <title>Redirecting...</title>
    </head>
    <body>
        Redirecting to <a href="/odf/guide/introduction/">introduction</a>...
    </body>
</html>'''
    
    root_index_path = os.path.join(script_dir, 'index.html')
    with open(root_index_path, 'w', encoding='utf-8') as f:
        f.write(root_index)
    file_count += 1
    
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Generated {folder_count} folders and {file_count} files\n")

if __name__ == '__main__':
    main()
