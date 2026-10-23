-- All comparison tables have a short label and a detailed explanation.
function Table(table)
  if #table.colspecs == 2 then
    table.colspecs[1][2] = 0.28
    table.colspecs[2][2] = 0.72
  end
  return table
end

local section_title = "Tổng hợp nội dung"
local table_number = 0
function Header(header)
  if header.level == 2 then
    section_title = pandoc.utils.stringify(header.content)
  end
  if header.level == 1 and pandoc.utils.stringify(header.content) == "Mở đầu" then
    return {pandoc.RawBlock('latex', '\\clearpage\\pagenumbering{arabic}'), header}
  end
end
-- Run heading tracking and captioning in document order.
return {{Header = Header, Table = function(t)
  t = Table(t)
  table_number = table_number + 1
  t.caption.long = {pandoc.Plain({pandoc.Str('Tổng hợp: ' .. section_title)})}
  t.identifier = 'tab-learning-' .. table_number
  return t
end}}
