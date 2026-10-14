import Foundation
import CoreGraphics
import ImageIO

let size = 1024
let colorSpace = CGColorSpaceCreateDeviceRGB()
let context = CGContext(data:nil,width:size,height:size,bitsPerComponent:8,bytesPerRow:size*4,space:colorSpace,bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
context.translateBy(x:0,y:CGFloat(size));context.scaleBy(x:1,y:-1)
let tile = CGPath(roundedRect:CGRect(x:80,y:80,width:864,height:864),cornerWidth:190,cornerHeight:190,transform:nil)
context.saveGState();context.addPath(tile);context.clip()
let colors = [CGColor(red:62/255,green:150/255,blue:101/255,alpha:1),CGColor(red:36/255,green:100/255,blue:68/255,alpha:1)] as CFArray
let gradient = CGGradient(colorsSpace:colorSpace,colors:colors,locations:[0,1])!
context.drawLinearGradient(gradient,start:CGPoint(x:512,y:80),end:CGPoint(x:512,y:944),options:[]);context.restoreGState()
let page=CGMutablePath();page.move(to:CGPoint(x:352,y:232));page.addLine(to:CGPoint(x:592,y:232));page.addLine(to:CGPoint(x:716,y:356));page.addLine(to:CGPoint(x:716,y:744));page.addQuadCurve(to:CGPoint(x:668,y:792),control:CGPoint(x:716,y:792));page.addLine(to:CGPoint(x:352,y:792));page.addQuadCurve(to:CGPoint(x:304,y:744),control:CGPoint(x:304,y:792));page.addLine(to:CGPoint(x:304,y:280));page.addQuadCurve(to:CGPoint(x:352,y:232),control:CGPoint(x:304,y:232));page.closeSubpath()
context.addPath(page);context.setFillColor(CGColor(red:243/255,green:250/255,blue:245/255,alpha:1));context.fillPath()
let fold=CGMutablePath();fold.move(to:CGPoint(x:592,y:232));fold.addLine(to:CGPoint(x:592,y:328));fold.addQuadCurve(to:CGPoint(x:620,y:356),control:CGPoint(x:592,y:356));fold.addLine(to:CGPoint(x:716,y:356));fold.closeSubpath();context.addPath(fold);context.setFillColor(CGColor(red:183/255,green:217/255,blue:194/255,alpha:1));context.fillPath()
context.setStrokeColor(CGColor(red:43/255,green:125/255,blue:83/255,alpha:1));context.setLineWidth(28);context.setLineCap(.round);context.setLineJoin(.round)
for y in [426,512]{context.move(to:CGPoint(x:390,y:y));context.addLine(to:CGPoint(x:634,y:y));context.strokePath()}
context.move(to:CGPoint(x:512,y:596));context.addLine(to:CGPoint(x:512,y:708));context.strokePath();context.move(to:CGPoint(x:448,y:644));context.addLine(to:CGPoint(x:512,y:708));context.addLine(to:CGPoint(x:576,y:644));context.strokePath()
let output=URL(fileURLWithPath:CommandLine.arguments[1])
let destination=CGImageDestinationCreateWithURL(output as CFURL,"public.png" as CFString,1,nil)!
CGImageDestinationAddImage(destination,context.makeImage()!,nil)
if !CGImageDestinationFinalize(destination){fatalError("Could not write icon")}
