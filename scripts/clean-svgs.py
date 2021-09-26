#!/usr/bin/python3
#Remove rubbish from svg files

import glob
import xml.etree.ElementTree as et

buildDir = "docs"
et = et.ElementTree()
targetNamespaces = ["{http://www.inkscape.org/namespaces/inkscape}"]

def cleanFile(inputFile):
  #Find metadata tag in document
  root = et.parse(inputFile)
  metadata = root.find("{http://www.w3.org/2000/svg}metadata")
  fileChanged = False

  #Remove if present
  if metadata != None:
    root.remove(metadata)
    fileChanged = True

  #Find all attributes matching namespaces to remove
  delKeys = []
  for attribute in root.attrib:
    for namespace in targetNamespaces:
      if namespace in attribute:
        delKeys.append(attribute)

  if delKeys == [] and fileChanged == False:
    return 0 #File not changed

  #Remove the marked keys
  for key in delKeys:
    root.attrib.pop(key)

  et.write(inputFile)
  return 1 #File changed

#Clean svg files in docs/
svgFiles = glob.glob(f"{buildDir}/*.svg")
if svgFiles == []:
  print("No svg files found to clean")
  exit(1)

#Loop through all svgs and optimise
changedFiles = 0
for file in svgFiles:
  changedFiles += cleanFile(file)

print(f"Cleaned {changedFiles} file(s)")
