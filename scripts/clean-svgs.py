#!/usr/bin/python3
#Remove rubbish from svg files

import glob
import xml.etree.ElementTree as et

buildDir = "docs"
et = et.ElementTree()
targetNamespaces = ["{http://www.inkscape.org/namespaces/inkscape}"]

def getResolutionDirs(searchPath):
  #Generate a list of directories matching searchPath/*x*
  resolutionDirs = []
  for directory in glob.glob(searchPath + "/*x*"):
    directory = directory.replace(searchPath + "/", "")
    if os.path.isdir(searchPath + "/" + directory):
      resolutionDirs.append(directory)
  resolutionDirs.append("scalable")

def cleanFile(inputFile):
  #Find metadata tag in document
  root = et.parse(inputFile)
  metadata = root.find("{http://www.w3.org/2000/svg}metadata")

  #Remove if present
  if metadata != None:
    root.remove(metadata)
  else:
    print(f"{inputFile} has no metadata tag")

  #Find all attributes matching namespaces to remove
  delKeys = []
  for attribute in root.attrib:
    for namespace in targetNamespaces:
      if namespace in attribute:
        delKeys.append(attribute)

  #Remove the marked keys
  for key in delKeys:
    root.attrib.pop(key)

  et.write(inputFile)

svgFiles = glob.glob(f"{buildDir}/*.svg")
if svgFiles == []:
  print("No svg files found to clean")
  exit(1)

#Loop through all svgs and optimise
for file in svgFiles:
  cleanFile(file)

print("Cleaned all files")
